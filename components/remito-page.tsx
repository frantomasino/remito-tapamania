"use client"

import { createClient } from "@/lib/supabase/client"
import { useState, useRef, useCallback, useEffect, useMemo, startTransition } from "react"
import { Printer, Eye, FileText, RotateCcw, Trash2, CheckCircle2 } from "lucide-react"
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
  type SaleRecord,
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

const LS_BASE_KEYS = {
  priceListId: "priceListId",
  salesHistory: "salesHistory",
  nextNumber: "nextNumber",
  lastDay: "lastDay",
} as const

function k(base: string, userId: string) {
  return `${base}:${userId}`
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

const BOTTOM_NAV_PX = 72
const ACTION_BAR_PX = 64

export default function RemitoPage() {
  const [userId, setUserId] = useState<string>("")

  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<LineItem[]>([])
  const [client, setClient] = useState<ClientData>(defaultClient)
  const [nextNumber, setNextNumber] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([])

  const [priceListId, setPriceListId] = useState<PriceListId>("minorista")
  const remitoDateRef = useRef<string>(getTodayDateSafe())

  const [mounted, setMounted] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  useEffect(() => setMounted(true), [])

  const toastTimer = useRef<number | null>(null)
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: "" })

  const showToast = useCallback((text: string) => {
    setToast({ open: true, text })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast({ open: false, text: "" }), 1400)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""))
  }, [])

  useEffect(() => {
    if (!userId) return
    try {
      const today = getTodayDateSafe()

      const salesKey = k(LS_BASE_KEYS.salesHistory, userId)
      const nextKey = k(LS_BASE_KEYS.nextNumber, userId)
      const listKey = k(LS_BASE_KEYS.priceListId, userId)
      const lastDayKey = k(LS_BASE_KEYS.lastDay, userId)

      const lastDay = localStorage.getItem(lastDayKey)
      if (lastDay && lastDay !== today) {
        localStorage.removeItem(salesKey)
        setSalesHistory([])
      }
      localStorage.setItem(lastDayKey, today)

      const savedList = localStorage.getItem(listKey) as PriceListId | null
      if (savedList === "minorista" || savedList === "mayorista" || savedList === "oferta") {
        setPriceListId(savedList)
      }

      const savedNext = localStorage.getItem(nextKey)
      if (savedNext) {
        const n = Number(savedNext)
        if (Number.isFinite(n) && n > 0) setNextNumber(n)
      }

      const savedHistory = localStorage.getItem(salesKey)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as SaleRecord[]
        if (Array.isArray(parsed)) setSalesHistory(parsed)
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
    if (next > prev) showToast("Producto agregado ✅")
  }, [items.length, showToast])

  useEffect(() => {
    const controller = new AbortController()

    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true)

        const res = await fetch(`/api/products-csv?list=${priceListId}`, {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error("No se pudo traer la lista de precios")
        }

        const text = await res.text()
        const parsed = parseCSV(text)

        startTransition(() => {
          setProducts(parsed)
        })
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return
        console.error("No se pudieron cargar productos", e)
        startTransition(() => {
          setProducts([])
        })
      } finally {
        setIsLoadingProducts(false)
      }
    }

    loadProducts()

    return () => controller.abort()
  }, [priceListId])

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

  const recordSale = useCallback(() => {
    if (!userId) return

    const clienteNombre = (remitoData.client.nombre ?? "").trim()
    const formaPago = (remitoData.client.formaPago ?? "").trim()

    const record: SaleRecord = {
      id: crypto.randomUUID(),
      numero: remitoData.numero,
      fecha: remitoData.fecha,
      cliente: clienteNombre || "Sin cliente",
      formaPago: formaPago || "Sin especificar",
      total: remitoData.total,
      itemCount: remitoData.items.length,
    }

    setSalesHistory((prev) => {
      const next = [record, ...prev]
      try {
        localStorage.setItem(k(LS_BASE_KEYS.salesHistory, userId), JSON.stringify(next))
      } catch {}
      return next
    })
  }, [remitoData, userId])

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

  const openIOSPrintWindow = useCallback(() => {
    const printable = document.getElementById("printable-remito")
    if (!printable) return

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n")

    const win = window.open("", "_blank")
    if (!win) return

    const html = `<!doctype html>
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

    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
  }, [])

  const handlePrint = useCallback(() => {
    if (!canPrint) return
    recordSale()
    advanceAndReset()

    if (isIOS()) {
      openIOSPrintWindow()
      return
    }

    window.print()
  }, [canPrint, recordSale, advanceAndReset, openIOSPrintWindow])

  const handlePreviewPrint = useCallback(() => {
    if (!canPrint) return
    setShowPreview(false)
    recordSale()
    advanceAndReset()

    if (isIOS()) {
      openIOSPrintWindow()
      return
    }

    window.print()
  }, [canPrint, recordSale, advanceAndReset, openIOSPrintWindow])

  const handleNewRemito = useCallback(() => {
    setClient(defaultClient)
    setItems([])
    showToast("Nuevo remito listo ✅")
  }, [showToast])

  const handleClearItems = useCallback(() => {
    setItems([])
    showToast("Productos vaciados")
  }, [showToast])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <FileText className="size-5 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div id="screen-ui" className="min-h-screen bg-background overflow-x-hidden">
        <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary shrink-0">
                <FileText className="size-5 text-primary-foreground" />
              </div>

              <div className="min-w-0">
                <div className="text-xs text-muted-foreground leading-none truncate">{remitoDateRef.current}</div>
                <div className="text-sm font-semibold text-foreground leading-tight truncate">N° {remitoNumero}</div>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <select
                className="h-9 rounded-lg border bg-background px-2 text-sm"
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

              <div className="hidden sm:flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handleNewRemito} aria-label="Nuevo remito" className="h-9 w-9">
                  <RotateCcw className="size-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  disabled={!canPrint}
                  onClick={() => setShowPreview(true)}
                  aria-label="Vista previa"
                  className="h-9 w-9"
                >
                  <Eye className="size-4" />
                </Button>

                <Button size="sm" onClick={handlePrint} disabled={!canPrint} className="h-9 rounded-lg">
                  <Printer className="size-4" />
                  <span className="ml-2">Imprimir</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main
          className="mx-auto max-w-5xl px-4 py-5 lg:px-6 overflow-x-hidden"
          style={{ paddingBottom: `calc(${BOTTOM_NAV_PX + ACTION_BAR_PX}px + env(safe-area-inset-bottom) + 16px)` }}
        >
          <div className="flex flex-col gap-6">
            <section className="rounded-xl bg-card border p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Productos</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Buscá y agregá productos de la lista seleccionada.
                  </p>
                </div>

                <div className="shrink-0 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                  {isLoadingProducts ? "Cargando lista..." : PRICE_LISTS.find((x) => x.id === priceListId)?.label}
                </div>
              </div>

              <div className="mt-4">
                <ProductSelector products={products} items={items} onItemsChange={setItems} />
              </div>
            </section>

            <section className="rounded-xl bg-card border p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">Comercio (opcional)</h2>
              <p className="mt-1 text-xs text-muted-foreground">Completalo solo si necesitás identificar el pedido.</p>

              <div className="mt-4">
                <ClientForm data={client} onChange={setClient} />
              </div>
            </section>
          </div>
        </main>

        <div
          className="fixed inset-x-0 z-50 border-t bg-card/95 backdrop-blur sm:hidden"
          style={{ bottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
        >
          <div className="px-3 py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-none">Total</p>
              <p className="text-[15px] font-bold text-primary tabular-nums truncate max-w-[42vw] leading-tight">
                {formatCurrency(total)}
              </p>
              <p className="text-[10px] text-muted-foreground">{items.length} items</p>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={handleNewRemito}
                aria-label="Nuevo remito"
                className="h-10 w-10"
              >
                <RotateCcw className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                disabled={items.length === 0}
                onClick={handleClearItems}
                aria-label="Vaciar"
                className="h-10 w-10"
              >
                <Trash2 className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                disabled={!canPrint}
                onClick={() => setShowPreview(true)}
                aria-label="Vista previa"
                className="h-10 w-10"
              >
                <Eye className="size-4" />
              </Button>

              <Button size="icon" disabled={!canPrint} onClick={handlePrint} aria-label="Imprimir" className="h-10 w-10">
                <Printer className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {toast.open && (
          <div
            className="fixed left-1/2 z-[60] -translate-x-1/2 sm:hidden"
            style={{ bottom: `calc(${BOTTOM_NAV_PX + ACTION_BAR_PX}px + env(safe-area-inset-bottom) + 18px)` }}
          >
            <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 shadow">
              <CheckCircle2 className="size-4 text-primary" />
              <p className="text-sm text-foreground">{toast.text}</p>
            </div>
          </div>
        )}
      </div>

      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent
            className="
              fixed left-1/2 top-1/2 z-50
              flex flex-col
              w-[calc(100vw-16px)] sm:w-full
              max-w-none sm:max-w-4xl
              h-[calc(100vh-16px)] sm:h-auto
              max-h-[calc(100vh-16px)] sm:max-h-[90vh]
              -translate-x-1/2 -translate-y-1/2
              p-0
              overflow-hidden
            "
          >
            <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <DialogTitle>Vista previa del remito</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="border rounded-lg overflow-hidden bg-white">
                <RemitoPrint data={remitoData} />
              </div>
            </div>

            <div className="sticky bottom-0 border-t bg-card/95 backdrop-blur px-4 py-3 sm:px-6">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cerrar
                </Button>
                <Button onClick={handlePreviewPrint}>
                  <Printer className="size-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div id="printable-remito">
        <RemitoPrint data={remitoData} />
      </div>
    </>
  )
}