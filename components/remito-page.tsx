"use client"

import { createClient } from "@/lib/supabase/client"
import type React from "react"
import { useState, useRef, useCallback, useEffect, useMemo, startTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Printer,
  FileText,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Eye,
  ChevronDown,
  ChevronUp,
  Bluetooth,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClientForm } from "@/components/client-form"
import { ProductSelector } from "@/components/product-selector"
import { RemitoPrint } from "@/components/remito-print"
import { connectBlePrinter, disconnectBlePrinter, writeEscPos } from "@/lib/bluetooth-printer"
import { buildRemitoEscPos } from "@/lib/remito-ticket-escpos"
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

function getPriceListLabel(value: PriceListId) {
  return PRICE_LISTS.find((list) => list.id === value)?.label ?? "Minorista"
}

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
  productsCache: "productsCache",
} as const

function k(base: string, userId: string) {
  return `${base}:${userId}`
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

const BOTTOM_NAV_PX = 72
const ACTION_BAR_EXPANDED_PX = 142
const ACTION_BAR_COLLAPSED_PX = 64

type ProductsCacheEntry = {
  loadedAt: number
  products: Product[]
}

function buildAddedToast(product: Product, opcion?: string) {
  const base = product.descripcion
    .replace(/\([^)]*\)/g, "")
    .replace(/#\S+/g, "")
    .replace(/\bTapas\s+para\s+/gi, "Tapas ")
    .replace(/\s{2,}/g, " ")
    .trim()

  const short = base.length > 32 ? `${base.slice(0, 32).trim()}…` : base
  return opcion ? `${short} · ${opcion}` : short
}

function PriceListSelect({
  value,
  onChange,
}: {
  value: PriceListId
  onChange: (value: PriceListId) => void
}) {
  return (
    <div className="relative min-w-[144px] max-w-[170px]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PriceListId)}
        aria-label="Lista de precios"
        className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-[#1a1a1c] px-3 pr-9 text-sm font-medium text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/20"
      >
        {PRICE_LISTS.map((list) => (
          <option key={list.id} value={list.id}>
            {list.label}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#9e9ea6]" />
    </div>
  )
}

export default function RemitoPage() {
  const [userId, setUserId] = useState<string>("")
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<LineItem[]>([])
  const [client, setClient] = useState<ClientData>(defaultClient)
  const [nextNumber, setNextNumber] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showConfirmNew, setShowConfirmNew] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [priceListId, setPriceListId] = useState<PriceListId>("minorista")
  const [mounted, setMounted] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPrintingBluetooth, setIsPrintingBluetooth] = useState(false)
  const [footerCollapsed, setFooterCollapsed] = useState(true)
  const [headerCollapsed, setHeaderCollapsed] = useState(true)

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
    }, 1900)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""))
  }, [])

  useEffect(() => {
    if (!userId) return

    const loadUserPreferences = async () => {
      try {
        const supabase = createClient()

        const { data: profile } = await supabase
          .from("profiles")
          .select("next_remito_number, selected_price_list")
          .eq("id", userId)
          .single()

        if (profile?.next_remito_number && Number(profile.next_remito_number) > 0) {
          setNextNumber(Number(profile.next_remito_number))
        }

        const selected = profile?.selected_price_list
        if (selected === "minorista" || selected === "mayorista" || selected === "oferta") {
          setPriceListId(selected)
        }

        const productsCacheKey = k(LS_BASE_KEYS.productsCache, userId)
        const rawProductsCache = localStorage.getItem(productsCacheKey)

        if (rawProductsCache) {
          const parsed = JSON.parse(rawProductsCache) as Record<PriceListId, ProductsCacheEntry>
          if (parsed?.minorista && parsed?.mayorista && parsed?.oferta) {
            productsCacheRef.current = parsed
          }
        }
      } catch {}
    }

    loadUserPreferences()
  }, [userId])

  useEffect(() => {
    if (!userId) return

    const savePriceList = async () => {
      try {
        const supabase = createClient()

        await supabase
          .from("profiles")
          .update({ selected_price_list: priceListId })
          .eq("id", userId)
      } catch {}
    }

    savePriceList()
  }, [priceListId, userId])

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
          startTransition(() => setProducts([]))
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
  const hasDraft = items.length > 0 || client.nombre.trim().length > 0

  const handleItemsChange = useCallback<React.Dispatch<React.SetStateAction<LineItem[]>>>(
    (updater) => {
      setItems((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater

        const prevMap = new Map(
          prev.map((item) => [`${item.product.descripcion}||${item.opcion ?? ""}`, item.cantidad])
        )

        for (const item of next) {
          const key = `${item.product.descripcion}||${item.opcion ?? ""}`
          const prevQty = prevMap.get(key) ?? 0

          if (item.cantidad > prevQty) {
            showToast(buildAddedToast(item.product, item.opcion))
            break
          }
        }

        return next
      })
    },
    [showToast]
  )

  const advanceAndReset = useCallback((nextVisibleNumber: number) => {
    setNextNumber(nextVisibleNumber)
    setClient(defaultClient)
    setItems([])
    remitoDateRef.current = getTodayDateSafe()
    setFooterCollapsed(true)
    setHeaderCollapsed(true)
  }, [])

  const persistRemito = useCallback(async (): Promise<number | null> => {
    if (!userId) {
      showToast("Falta sesión")
      return null
    }

    if (items.length === 0) {
      showToast("No hay productos")
      return null
    }

    try {
      setIsSaving(true)

      const supabase = createClient()

      const { data: consumedNumber, error: consumeError } = await supabase.rpc(
        "consume_next_remito_number"
      )

      if (consumeError || typeof consumedNumber !== "number") {
        console.error("Error consumiendo numeración", consumeError)
        showToast("Error al generar número")
        return null
      }

      const numeroRemitoFinal = formatRemitoNumber(consumedNumber)

      const { data: remitoInserted, error: remitoError } = await supabase
        .from("remitos")
        .insert({
          user_id: userId,
          numero_remito: numeroRemitoFinal,
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
        return null
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
        return null
      }

      return consumedNumber + 1
    } catch (error) {
      console.error("Error inesperado guardando remito", error)
      showToast("Error al guardar")
      return null
    } finally {
      setIsSaving(false)
    }
  }, [userId, items, client.nombre, priceListId, total, showToast])

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
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Imprimir Remito</title>
${styles}
<style>
  @page {
    size: 58mm auto;
    margin: 0;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 58mm;
    background: #fff;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  * {
    box-sizing: border-box;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 9999;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    align-items: center;
    padding: 10px 8px;
    background: #fff;
    border-bottom: 1px solid #ddd;
  }

  .btn {
    appearance: none;
    -webkit-appearance: none;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid #d0d0d0;
    background: #fff;
    color: #111 !important;
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    white-space: nowrap;
  }

  .btn * {
    color: inherit !important;
  }

  .btn-primary {
    background: #111 !important;
    color: #fff !important;
    border-color: #111 !important;
  }

  .btn-primary * {
    color: inherit !important;
  }

  .sheet {
    width: 48mm;
    min-width: 48mm;
    max-width: 48mm;
    padding: 0;
    margin: 0 auto;
    background: #fff;
  }

  #printable-remito {
    display: block !important;
    width: 48mm !important;
    min-width: 48mm !important;
    max-width: 48mm !important;
    background: #fff !important;
    color: #000 !important;
  }

  @media print {
    .topbar {
      display: none !important;
    }

    html, body {
      width: 58mm;
      background: #fff !important;
      color: #000 !important;
    }

    .sheet {
      width: 48mm;
      min-width: 48mm;
      max-width: 48mm;
      margin: 0;
    }
  }
</style>
</head>
<body>
  <div class="topbar">
    <button type="button" class="btn" id="btnClose">Cerrar</button>
    <button type="button" class="btn btn-primary" id="btnPrint">Imprimir</button>
  </div>

  <div class="sheet">
    ${printable.outerHTML}
  </div>

  <script>
    const btnPrint = document.getElementById("btnPrint");
    const btnClose = document.getElementById("btnClose");

    if (btnPrint) {
      btnPrint.addEventListener("click", () => window.print());
    }

    if (btnClose) {
      btnClose.addEventListener("click", () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      });
    }
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
    if (!canPrint || isSaving || isPrintingBluetooth) return

    const printWindow = isIOS() ? openPrintWindowImmediate() : null

    if (isIOS() && !printWindow) {
      showToast("No se pudo abrir impresión")
      return
    }

    if (!isIOS()) {
      window.print()
    }

    const nextVisibleNumber = await persistRemito()
    if (!nextVisibleNumber) return

    advanceAndReset(nextVisibleNumber)
  }, [
    canPrint,
    isSaving,
    isPrintingBluetooth,
    openPrintWindowImmediate,
    persistRemito,
    advanceAndReset,
    showToast,
  ])

  const handlePreviewPrint = useCallback(async () => {
    if (!canPrint || isSaving || isPrintingBluetooth) return

    setShowPreview(false)

    const printWindow = isIOS() ? openPrintWindowImmediate() : null

    if (isIOS() && !printWindow) {
      showToast("No se pudo abrir impresión")
      return
    }

    if (!isIOS()) {
      window.print()
    }

    const nextVisibleNumber = await persistRemito()
    if (!nextVisibleNumber) return

    advanceAndReset(nextVisibleNumber)
  }, [
    canPrint,
    isSaving,
    isPrintingBluetooth,
    openPrintWindowImmediate,
    persistRemito,
    advanceAndReset,
    showToast,
  ])

  const handleBluetoothPrint = useCallback(async () => {
    if (!canPrint || isSaving || isPrintingBluetooth) return

    try {
      setIsPrintingBluetooth(true)
      showToast("Buscando impresora térmica...")

      const payload = buildRemitoEscPos(remitoData)
      const { device, characteristic } = await connectBlePrinter()

      showToast(`Conectado a ${device.name?.trim() || "impresora térmica"}. Enviando...`)

      try {
        await writeEscPos(characteristic, payload)
      } finally {
        await disconnectBlePrinter(device)
      }

      const nextVisibleNumber = await persistRemito()
      if (!nextVisibleNumber) return

      advanceAndReset(nextVisibleNumber)
      showToast("Ticket enviado a la impresora")
    } catch (error) {
      console.error("Error imprimiendo por Bluetooth", error)

      const message =
        error instanceof Error ? error.message : "No se pudo imprimir por Bluetooth"

      if (/bluetooth no disponible/i.test(message)) {
        showToast("Este celular o navegador no admite BT")
        return
      }

      if (/no se pudo abrir conexión bluetooth/i.test(message)) {
        showToast("No se pudo conectar con la impresora")
        return
      }

      if (/no parece compatible/i.test(message)) {
        showToast("La impresora no es compatible")
        return
      }

      if (/characteristic/i.test(message)) {
        showToast("Se encontró la impresora, pero no respondió")
        return
      }

      showToast("Falló la impresión por BT")
    } finally {
      setIsPrintingBluetooth(false)
    }
  }, [
    canPrint,
    isSaving,
    isPrintingBluetooth,
    remitoData,
    persistRemito,
    advanceAndReset,
    showToast,
  ])

  const confirmNewRemito = useCallback(() => {
    setClient(defaultClient)
    setItems([])
    setShowActions(false)
    setShowConfirmNew(false)
    setFooterCollapsed(true)
    setHeaderCollapsed(true)
    showToast("Nuevo remito listo")
  }, [showToast])

  const confirmClearItems = useCallback(() => {
    setItems([])
    setShowActions(false)
    setShowConfirmClear(false)
    setFooterCollapsed(true)
    showToast("Productos vaciados")
  }, [showToast])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111214] px-4">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#1b1b1d] px-4 py-3 shadow-sm">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-[#1976d2] text-white">
            <FileText className="size-4" />
          </div>
          <p className="text-sm font-medium text-[#b0b0b6]">Cargando remito...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div id="screen-ui" className="min-h-screen overflow-x-hidden bg-[#111214] text-white">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#111214]/95 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-md px-4 pb-3 pt-3">
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#2a2926] shadow-[0_1px_0_rgba(255,255,255,0.03)]">
              <button
                type="button"
                onClick={() => setHeaderCollapsed((prev) => !prev)}
                className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left"
                aria-expanded={!headerCollapsed}
                aria-label={headerCollapsed ? "Mostrar datos del pedido" : "Ocultar datos del pedido"}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9f9fa6]">
                    Pedido nuevo
                  </p>
                  <h1 className="mt-0.5 truncate text-[16px] font-semibold leading-none text-white">
                    {client.nombre?.trim() || "Nuevo remito"}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] leading-none text-[#a9a9ae]">
                    <span className="font-semibold text-white">{remitoNumero}</span>
                    <span className="text-white/15">•</span>
                    <span>{remitoDateRef.current}</span>
                    <span className="text-white/15">•</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-[#d7d7db]">
                      {getPriceListLabel(priceListId)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowActions(true)
                    }}
                    aria-label="Más acciones"
                    className="size-9 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>

                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-black/15 ring-1 ring-white/10">
                    {headerCollapsed ? (
                      <ChevronDown className="size-4 text-[#c4c4c8]" />
                    ) : (
                      <ChevronUp className="size-4 text-[#c4c4c8]" />
                    )}
                  </div>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {!headerCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <PriceListSelect value={priceListId} onChange={setPriceListId} />

                        <div className="rounded-2xl border border-white/10 bg-[#1a1a1c] px-3 py-2 text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a9a9ae]">
                            Total
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-white tabular-nums">
                            {formatCurrency(total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main
          className="mx-auto w-full max-w-md px-4 pb-4 pt-3"
          style={{
            paddingBottom: `calc(${BOTTOM_NAV_PX + (footerCollapsed ? ACTION_BAR_COLLAPSED_PX : ACTION_BAR_EXPANDED_PX)}px + env(safe-area-inset-bottom) + 18px)`,
          }}
        >
          <div className="space-y-5">
            <section className="pt-1">
              {isLoadingProducts && products.length === 0 ? (
                <div className="space-y-3">
                  <div className="h-11 animate-pulse rounded-xl bg-[#1a1a1c]" />
                  <div className="h-20 animate-pulse rounded-2xl bg-[#1a1a1c]" />
                  <div className="h-20 animate-pulse rounded-2xl bg-[#1a1a1c]" />
                </div>
              ) : (
                <ProductSelector
                  products={products}
                  items={items}
                  onItemsChange={handleItemsChange}
                />
              )}
            </section>

            <section className="pt-1">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[#d6d6da]">
                    Datos del comercio
                  </h2>
                  <p className="mt-1 text-sm text-[#9e9ea6]">
                    Opcional. Se imprimen en el remito si los completás.
                  </p>
                </div>

                <span className="rounded-full border border-white/10 bg-[#1a1a1c] px-2.5 py-1 text-[11px] font-medium text-[#b0b0b6]">
                  Opcional
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
                <ClientForm
                  data={client}
                  onFieldChange={(field, value) =>
                    setClient((prev) => ({ ...prev, [field]: value }))
                  }
                />
              </div>
            </section>
          </div>
        </main>

        <div
          className="fixed inset-x-0 z-50 border-t border-white/10 bg-[#2a2926]/98 backdrop-blur-xl"
          style={{ bottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
        >
          <div className="mx-auto w-full max-w-md px-4 py-3">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#2f2d29] shadow-lg">
              <button
                type="button"
                onClick={() => setFooterCollapsed((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={!footerCollapsed}
                aria-label={footerCollapsed ? "Mostrar acciones del remito" : "Ocultar acciones del remito"}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a9a9ae]">
                    Total del remito
                  </p>
                  <p className="mt-1 truncate text-[18px] font-semibold tracking-tight text-white tabular-nums">
                    {formatCurrency(total)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-medium text-[#d1d1d5]">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </div>

                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-black/15 ring-1 ring-white/10">
                    {footerCollapsed ? (
                      <ChevronUp className="size-4 text-[#c4c4c8]" />
                    ) : (
                      <ChevronDown className="size-4 text-[#c4c4c8]" />
                    )}
                  </div>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {!footerCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <div className="px-4 py-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#b0b0b6]">
                            {items.length} {items.length === 1 ? "producto" : "productos"} cargados
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-white tabular-nums">
                          {formatCurrency(total)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="default"
                          onClick={handleBluetoothPrint}
                          disabled={!canPrint || isSaving || isPrintingBluetooth}
                          className="h-11 rounded-xl bg-[#1976d2] text-white hover:bg-[#1c82e4]"
                        >
                          {isPrintingBluetooth ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Bluetooth className="size-4" />
                          )}
                          <span>{isPrintingBluetooth ? "Conectando..." : "Imprimir BT"}</span>
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => setShowPreview(true)}
                          disabled={!canPrint || isPrintingBluetooth}
                          className="h-11 rounded-xl border-white/15 bg-transparent text-white hover:bg-white/5"
                        >
                          <Eye className="size-4" />
                          <span>Ver ticket</span>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {toast.open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed left-1/2 z-[60] w-[calc(100%-32px)] max-w-sm -translate-x-1/2"
              style={{
                bottom: `calc(${BOTTOM_NAV_PX + (footerCollapsed ? ACTION_BAR_COLLAPSED_PX : ACTION_BAR_EXPANDED_PX)}px + env(safe-area-inset-bottom) + 12px)`,
              }}
              role="alert"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1b1b1d] px-4 py-3 shadow-lg">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1976d2] text-white">
                  <CheckCircle2 className="size-4" />
                </div>
                <p className="text-sm font-medium text-white">{toast.text}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent
          className="
            fixed left-1/2 top-1/2 z-50
            flex h-[100dvh] w-screen max-w-none
            -translate-x-1/2 -translate-y-1/2
            flex-col overflow-hidden rounded-none border-0 bg-[#111214] p-0 text-white
            sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-4xl sm:rounded-3xl sm:border sm:border-white/10
          "
        >
          <DialogHeader className="border-b border-white/10 px-4 py-4">
            <DialogTitle className="text-base font-semibold tracking-tight text-white">
              Ver ticket
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-[#161618] px-3 py-3 sm:px-4 sm:py-4">
            <div className="mx-auto w-fit overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/10">
              <RemitoPrint data={remitoData} />
            </div>
          </div>

          <div className="border-t border-white/10 bg-[#111214] px-4 py-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="flex-1 border-white/15 bg-transparent text-white hover:bg-white/5"
              >
                Cerrar
              </Button>
              <Button
                onClick={handlePreviewPrint}
                disabled={isSaving || isPrintingBluetooth}
                size="lg"
                className="flex-1 bg-[#1976d2] text-white hover:bg-[#1c82e4]"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Printer className="size-4" />
                )}
                <span>{isSaving ? "Imprimiendo..." : "Imprimir normal"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showActions} onOpenChange={setShowActions}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-[#1b1b1d] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold tracking-tight text-white">
              Acciones del pedido
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowActions(false)
                if (!hasDraft) {
                  confirmNewRemito()
                  return
                }
                setShowConfirmNew(true)
              }}
              className="justify-start border-white/10 bg-transparent text-white hover:bg-white/5"
            >
              <RotateCcw className="size-4" />
              Nuevo remito
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setShowActions(false)
                if (items.length === 0) return
                setShowConfirmClear(true)
              }}
              disabled={items.length === 0}
              className="justify-start border-white/10 bg-transparent text-white hover:bg-white/5"
            >
              <Trash2 className="size-4" />
              Vaciar productos
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setShowActions(false)
                setShowPreview(true)
              }}
              disabled={!canPrint}
              className="justify-start border-white/10 bg-transparent text-white hover:bg-white/5"
            >
              <Eye className="size-4" />
              Ver ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmNew} onOpenChange={setShowConfirmNew}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-[#1b1b1d] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold tracking-tight text-white">
              Empezar un nuevo remito
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-[#b0b0b6]">
            Se va a limpiar el pedido actual y vas a empezar uno nuevo.
          </p>

          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/5"
              onClick={() => setShowConfirmNew(false)}
            >
              Cancelar
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-[#1976d2] text-white hover:bg-[#1c82e4]"
              onClick={confirmNewRemito}
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmClear} onOpenChange={setShowConfirmClear}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-[#1b1b1d] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold tracking-tight text-white">
              Vaciar productos
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-[#b0b0b6]">
            Se van a eliminar {items.length} {items.length === 1 ? "producto" : "productos"} del pedido actual.
          </p>

          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/5"
              onClick={() => setShowConfirmClear(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="lg"
              className="flex-1"
              onClick={confirmClearItems}
            >
              Vaciar
            </Button>
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