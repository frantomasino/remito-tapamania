"use client"

import { createClient } from "@/lib/supabase/client"
import { useState, useRef, useCallback, useEffect, useMemo, startTransition } from "react"
import {
  Printer,
  Eye,
  FileText,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClientForm } from "@/components/client-form"
import { ProductSelector } from "@/components/product-selector"
import { RemitoPrint } from "@/components/remito-print"
import {
  type Product,
  type LineItem,
  type ClientData,
  type RemitoData,
  formatRemitoNumber,
  formatCurrency,
  parseCSV,
} from "@/lib/remito-types"

type PriceListId = "minorista" | "mayorista" | "oferta"

const PRICE_LISTS: { id: PriceListId; label: string }[] = [
  { id: "minorista", label: "Minorista" },
  { id: "mayorista", label: "Mayorista" },
  { id: "oferta", label: "Oferta" },
]

const defaultClient: ClientData = {
  nombre: "",
  direccion: "",
  telefono: "",
  mail: "",
  formaPago: "",
}

function getTodayDateSafe(): string {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getTodayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

const LS_BASE_KEYS = {
  priceListId: "priceListId",
  nextNumber: "nextNumber",
  productsCache: "productsCache",
} as const

function k(base: string, userId: string) {
  return `${base}:${userId}`
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

const BOTTOM_NAV_PX = 72
const ACTION_BAR_PX = 68

type ProductsCacheEntry = {
  loadedAt: number
  products: Product[]
}

export default function RemitoPage() {
  const [userId, setUserId] = useState<string>("")
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<LineItem[]>([])
  const [client, setClient] = useState<ClientData>(defaultClient)
  const [nextNumber, setNextNumber] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [priceListId, setPriceListId] = useState<PriceListId>("minorista")
  const [mounted, setMounted] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const remitoDateRef = useRef<string>(getTodayDateSafe())
  const toastTimer = useRef<number | null>(null)

  const [toast, setToast] = useState<{ open: boolean; text: string }>({
    open: false,
    text: "",
  })

  const productsCacheRef = useRef<Record<PriceListId, ProductsCacheEntry>>({
    minorista: { loadedAt: 0, products: [] },
    mayorista: { loadedAt: 0, products: [] },
    oferta: { loadedAt: 0, products: [] },
  })

  useEffect(() => setMounted(true), [])

  const showToast = useCallback((text: string) => {
    setToast({ open: true, text })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => {
      setToast({ open: false, text: "" })
    }, 1400)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""))
  }, [])

  useEffect(() => {
    if (!userId) return

    try {
      const nextKey = k(LS_BASE_KEYS.nextNumber, userId)
      const listKey = k(LS_BASE_KEYS.priceListId, userId)
      const productsCacheKey = k(LS_BASE_KEYS.productsCache, userId)

      const savedList = localStorage.getItem(listKey) as PriceListId | null
      if (savedList === "minorista" || savedList === "mayorista" || savedList === "oferta") {
        setPriceListId(savedList)
      }

      const savedNext = localStorage.getItem(nextKey)
      if (savedNext) {
        const n = Number(savedNext)
        if (Number.isFinite(n) && n > 0) setNextNumber(n)
      }

      const rawProductsCache = localStorage.getItem(productsCacheKey)
      if (rawProductsCache) {
        const parsed = JSON.parse(rawProductsCache) as Record<PriceListId, ProductsCacheEntry>
        if (parsed?.minorista && parsed?.mayorista && parsed?.oferta) {
          productsCacheRef.current = parsed
        }
      }
    } catch {}
  }, [userId])

  useEffect(() => {
    if (!userId) return
    try {
      localStorage.setItem(k(LS_BASE_KEYS.priceListId, userId), priceListId)
    } catch {}
  }, [priceListId, userId])

  useEffect(() => {
    if (!userId) return
    try {
      localStorage.setItem(k(LS_BASE_KEYS.nextNumber, userId), String(nextNumber))
    } catch {}
  }, [nextNumber, userId])

  const prevCountRef = useRef(0)
  useEffect(() => {
    const prev = prevCountRef.current
    const next = items.length
    prevCountRef.current = next
    if (next > prev) showToast("Producto agregado")
  }, [items.length, showToast])

  const saveProductsCache = useCallback(
    (cache: Record<PriceListId, ProductsCacheEntry>) => {
      if (!userId) return
      try {
        localStorage.setItem(k(LS_BASE_KEYS.productsCache, userId), JSON.stringify(cache))
      } catch {}
    },
    [userId]
  )

  useEffect(() => {
    const controller = new AbortController()

    const loadProducts = async () => {
      const cached = productsCacheRef.current[priceListId]

      if (cached?.products?.length > 0) {
        setProducts(cached.products)
        return
      }

      try {
        setIsLoadingProducts(true)

        const res = await fetch(`/api/products-csv?list=${priceListId}`, {
          cache: "force-cache",
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error("No se pudo traer la lista de precios")
        }

        const text = await res.text()
        const parsed = parseCSV(text)

        const nextCache = {
          ...productsCacheRef.current,
          [priceListId]: {
            loadedAt: Date.now(),
            products: parsed,
          },
        }

        productsCacheRef.current = nextCache
        saveProductsCache(nextCache)

        startTransition(() => {
          setProducts(parsed)
        })
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return
        console.error("No se pudieron cargar productos", e)
        if (!productsCacheRef.current[priceListId]?.products?.length) {
          startTransition(() => {
            setProducts([])
          })
        }
      } finally {
        setIsLoadingProducts(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [priceListId, saveProductsCache])

  const remitoNumero = useMemo(() => formatRemitoNumber(nextNumber), [nextNumber])
  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])

  const remitoData: RemitoData = useMemo(
    () => ({
      numero: remitoNumero,
      fecha: remitoDateRef.current,
      client,
      items,
      subtotal: total,
      total,
    }),
    [remitoNumero, client, items, total]
  )

  const canPrint = items.length > 0
  const selectedListLabel = PRICE_LISTS.find((x) => x.id === priceListId)?.label ?? "Lista"

  const advanceAndReset = useCallback(() => {
    setNextNumber((n) => {
      const next = n + 1
      try {
        if (userId) localStorage.setItem(k(LS_BASE_KEYS.nextNumber, userId), String(next))
      } catch {}
      return next
    })

    setClient(defaultClient)
    setItems([])
    remitoDateRef.current = getTodayDateSafe()
  }, [userId])

  const persistRemito = useCallback(async () => {
    if (!userId) {
      showToast("Falta sesión")
      return false
    }

    if (items.length === 0) {
      showToast("No hay productos")
      return false
    }

    try {
      setIsSaving(true)

      const supabase = createClient()

      const { data: remitoInserted, error: remitoError } = await supabase
        .from("remitos")
        .insert({
          user_id: userId,
          numero_remito: remitoNumero,
          fecha: getTodayISODate(),
          cliente_nombre: client.nombre?.trim() || null,
          estado: "pendiente",
          observaciones: null,
          price_list_id: priceListId,
          total,
        })
        .select("id")
        .single()

      if (remitoError || !remitoInserted) {
        console.error("Error guardando remito", remitoError)
        showToast("Error al guardar")
        return false
      }

      const remitoItems = items.map((item) => ({
        remito_id: remitoInserted.id,
        descripcion: item.product.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.product.precio,
        subtotal: item.subtotal,
        opcion: item.opcion || null,
      }))

      const { error: itemsError } = await supabase.from("remito_items").insert(remitoItems)

      if (itemsError) {
        console.error("Error guardando items", itemsError)
        showToast("Error al guardar items")
        return false
      }

      return true
    } catch (error) {
      console.error("Error inesperado guardando remito", error)
      showToast("Error al guardar")
      return false
    } finally {
      setIsSaving(false)
    }
  }, [userId, items, remitoNumero, client.nombre, priceListId, total, showToast])

  const buildPrintHtml = useCallback(() => {
    const printable = document.getElementById("printable-remito")
    if (!printable) return null

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n")

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Imprimir Remito</title>
${styles}
<style>
  body { margin: 0; background: #f5f5f5; }
  .topbar{
    position: sticky; top:0; z-index:10;
    display:flex; gap:10px; justify-content:flex-end; align-items:center;
    padding:12px; background:#fff; border-bottom:1px solid #ddd;
  }
  .btn{
    font-size:16px; padding:10px 14px; border-radius:10px;
    border:1px solid #ccc; background:#fff;
  }
  .btn-primary{ background:#0f172a; color:#fff; border-color:#0f172a; }
  .sheet{ padding:12px; }
  #printable-remito{ display:block !important; background:#fff !important; }
</style>
</head>
<body>
  <div class="topbar">
    <button class="btn" id="btnClose">Cerrar</button>
    <button class="btn btn-primary" id="btnPrint">Imprimir</button>
  </div>
  <div class="sheet">
    ${printable.outerHTML}
  </div>
  <script>
    document.getElementById("btnPrint").addEventListener("click", () => window.print());
    document.getElementById("btnClose").addEventListener("click", () => window.close());
  </script>
</body>
</html>`
  }, [])

  const openPrintWindowImmediate = useCallback(() => {
    const html = buildPrintHtml()
    if (!html) return null

    const win = window.open("", "_blank")
    if (!win) return null

    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()

    return win
  }, [buildPrintHtml])

  const handlePrint = useCallback(async () => {
    if (!canPrint || isSaving) return

    const printWindow = isIOS() ? openPrintWindowImmediate() : null

    if (isIOS() && !printWindow) {
      showToast("No se pudo abrir impresión")
      return
    }

    if (!isIOS()) {
      window.print()
    }

    const ok = await persistRemito()
    if (!ok) return

    advanceAndReset()
  }, [canPrint, isSaving, openPrintWindowImmediate, persistRemito, advanceAndReset, showToast])

  const handlePreviewPrint = useCallback(async () => {
    if (!canPrint || isSaving) return

    setShowPreview(false)

    const printWindow = isIOS() ? openPrintWindowImmediate() : null

    if (isIOS() && !printWindow) {
      showToast("No se pudo abrir impresión")
      return
    }

    if (!isIOS()) {
      window.print()
    }

    const ok = await persistRemito()
    if (!ok) return

    advanceAndReset()
  }, [canPrint, isSaving, openPrintWindowImmediate, persistRemito, advanceAndReset, showToast])

  const handleNewRemito = useCallback(() => {
    setClient(defaultClient)
    setItems([])
    showToast("Nuevo remito listo")
  }, [showToast])

  const handleClearItems = useCallback(() => {
    setItems([])
    showToast("Productos vaciados")
  }, [showToast])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="size-4 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div id="screen-ui" className="min-h-screen overflow-x-hidden bg-background">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto w-full max-w-5xl px-3 py-2.5">
            <div className="rounded-2xl border bg-card px-3 py-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary">
                  <FileText className="size-4 text-primary-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Nuevo remito
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      N° {remitoNumero}
                    </p>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {selectedListLabel}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-muted-foreground">{remitoDateRef.current}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                  <p className="truncate text-base font-semibold leading-tight text-foreground tabular-nums">
                    {formatCurrency(total)}
                  </p>
                </div>

                <div className="min-w-[124px]">
                  <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                    Lista
                  </label>
                  <select
                    className="h-9 w-full rounded-xl border bg-background px-2.5 text-xs font-medium text-foreground outline-none"
                    value={priceListId}
                    onChange={(e) => setPriceListId(e.target.value as PriceListId)}
                    aria-label="Lista de precios"
                  >
                    {PRICE_LISTS.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main
          className="mx-auto w-full max-w-5xl px-3 py-3"
          style={{
            paddingBottom: `calc(${BOTTOM_NAV_PX + ACTION_BAR_PX}px + env(safe-area-inset-bottom) + 12px)`,
          }}
        >
          <div className="space-y-3">
            <section className="rounded-2xl border bg-card p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">Productos</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {isLoadingProducts ? "Cargando lista..." : `${items.length} cargados`}
                  </p>
                </div>

                <div className="shrink-0 rounded-full border bg-background px-2.5 py-1 text-[10px] text-muted-foreground">
                  {selectedListLabel}
                </div>
              </div>

              {isLoadingProducts && products.length === 0 ? (
                <div className="space-y-2">
                  <div className="h-10 animate-pulse rounded-xl bg-muted" />
                  <div className="h-16 animate-pulse rounded-xl bg-muted" />
                  <div className="h-16 animate-pulse rounded-xl bg-muted" />
                </div>
              ) : (
                <ProductSelector products={products} items={items} onItemsChange={setItems} />
              )}
            </section>

            <section className="rounded-2xl border bg-card p-3">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground">Comercio</h2>
                <p className="text-[11px] text-muted-foreground">Opcional</p>
              </div>

              <ClientForm
                data={client}
                onFieldChange={(field, value) =>
                  setClient((prev) => ({ ...prev, [field]: value }))
                }
              />
            </section>
          </div>
        </main>

        <div
          className="fixed inset-x-0 z-50 border-t bg-card/95 backdrop-blur sm:hidden"
          style={{ bottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
        >
          <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="truncate text-base font-semibold leading-tight text-foreground tabular-nums">
                {formatCurrency(total)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={handleNewRemito}
                aria-label="Nuevo remito"
                className="h-10 w-10 rounded-xl"
              >
                <RotateCcw className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                disabled={items.length === 0}
                onClick={handleClearItems}
                aria-label="Vaciar productos"
                className="h-10 w-10 rounded-xl"
              >
                <Trash2 className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                disabled={!canPrint}
                onClick={() => setShowPreview(true)}
                aria-label="Vista previa"
                className="h-10 w-10 rounded-xl"
              >
                <Eye className="size-4" />
              </Button>

              <Button
                disabled={!canPrint || isSaving}
                onClick={handlePrint}
                aria-label="Imprimir"
                className="h-10 rounded-xl px-3"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                <span className="ml-1.5 text-sm">{isSaving ? "Guardando" : "Imprimir"}</span>
              </Button>
            </div>
          </div>
        </div>

        {toast.open && (
          <div
            className="fixed left-1/2 z-[60] w-[calc(100%-24px)] max-w-xs -translate-x-1/2 sm:hidden"
            style={{
              bottom: `calc(${BOTTOM_NAV_PX + ACTION_BAR_PX}px + env(safe-area-inset-bottom) + 10px)`,
            }}
          >
            <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 shadow">
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
              <p className="text-sm text-foreground">{toast.text}</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent
          className="
            fixed left-1/2 top-1/2 z-50
            flex h-[100dvh] w-screen max-w-none
            -translate-x-1/2 -translate-y-1/2
            flex-col overflow-hidden rounded-none border-0 p-0
            sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-4xl sm:rounded-2xl sm:border
          "
        >
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-sm font-semibold">Vista previa</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-muted/20 px-3 py-3">
            <div className="overflow-hidden rounded-xl border bg-white">
              <RemitoPrint data={remitoData} />
            </div>
          </div>

          <div className="border-t bg-card px-3 py-3">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)} className="h-10 flex-1 rounded-xl">
                Cerrar
              </Button>
              <Button onClick={handlePreviewPrint} disabled={isSaving} className="h-10 flex-1 rounded-xl">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                {isSaving ? "Guardando..." : "Imprimir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="hidden" aria-hidden="true">
        <div id="printable-remito">
          <RemitoPrint data={remitoData} />
        </div>
      </div>
    </>
  )
}