"use client"

import { createClient } from "@/lib/supabase/client"
import type React from "react"
import { useState, useRef, useCallback, useEffect, useMemo, startTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Printer, FileText, CheckCircle2, Loader2, Eye,
  Bluetooth, ChevronDown, ChevronUp, Plus, WifiOff,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProductSelector } from "@/components/product-selector"
import { RemitoPrint } from "@/components/remito-print"
import { connectBlePrinter, disconnectBlePrinter, writeEscPos } from "@/lib/bluetooth-printer"
import { buildRemitoEscPos } from "@/lib/remito-ticket-escpos"
import {
  type Product, type LineItem, type ClientData, type RemitoData,
  formatRemitoNumber, formatCurrency, parseCSV,
} from "@/lib/remito-types"

type PriceListId = "minorista" | "mayorista" | "oferta"

const PRICE_LISTS: { id: PriceListId; label: string }[] = [
  { id: "minorista", label: "Minorista" },
  { id: "mayorista", label: "Mayorista" },
  { id: "oferta", label: "Oferta" },
]

const defaultClient: ClientData = { nombre: "", direccion: "", telefono: "", mail: "", formaPago: "" }

function getTodayDateSafe(): string {
  return new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}
function getTodayISODate(): string { return new Date().toISOString().slice(0, 10) }

const LS_BASE_KEYS = { productsCache: "productsCache", draft: "remitoDraft" } as const
function k(base: string, userId: string) { return `${base}:${userId}` }
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

const BOTTOM_NAV_PX = 72
const ACTION_BAR_EXPANDED_PX = 56
const ACTION_BAR_COLLAPSED_PX = 28

type ProductsCacheEntry = { loadedAt: number; products: Product[] }
type DraftData = { items: LineItem[]; clientNombre: string; priceListId: PriceListId; savedAt: number }
type SuccessState = { remitoId: string; numero: string; cliente: string; total: number; unidades: number } | null

function buildAddedToast(product: Product, opcion?: string) {
  const base = product.descripcion.replace(/\([^)]*\)/g, "").replace(/#\S+/g, "").replace(/\bTapas\s+para\s+/gi, "Tapas ").replace(/\s{2,}/g, " ").trim()
  const short = base.length > 28 ? `${base.slice(0, 28).trim()}…` : base
  return opcion ? `${short} · ${opcion}` : short
}

export default function RemitoPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>("")
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<LineItem[]>([])
  const [client, setClient] = useState<ClientData>(defaultClient)
  const [nextNumber, setNextNumber] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirmNew, setShowConfirmNew] = useState(false)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [successState, setSuccessState] = useState<SuccessState>(null)
  const [priceListId, setPriceListId] = useState<PriceListId>("minorista")
  const [mounted, setMounted] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPrintingBluetooth, setIsPrintingBluetooth] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [actionBarCollapsed, setActionBarCollapsed] = useState(false)

  const remitoDateRef = useRef<string>(getTodayDateSafe())
  const toastTimer = useRef<number | null>(null)
  const draftSaveTimer = useRef<number | null>(null)
  const draftRestoredRef = useRef(false)
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: "" })

  const productsCacheRef = useRef<Record<PriceListId, ProductsCacheEntry>>({
    minorista: { loadedAt: 0, products: [] },
    mayorista: { loadedAt: 0, products: [] },
    oferta: { loadedAt: 0, products: [] },
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const sync = () => setIsOnline(window.navigator.onLine)
    sync()
    window.addEventListener("online", sync)
    window.addEventListener("offline", sync)
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync) }
  }, [])

  const showToast = useCallback((text: string) => {
    setToast({ open: true, text })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast({ open: false, text: "" }), 1900)
  }, [])

  const saveDraft = useCallback((currentItems: LineItem[], currentClient: ClientData, currentPriceList: PriceListId, uid: string) => {
    if (!uid) return
    try {
      if (currentItems.length === 0 && !currentClient.nombre.trim()) { localStorage.removeItem(k(LS_BASE_KEYS.draft, uid)); return }
      localStorage.setItem(k(LS_BASE_KEYS.draft, uid), JSON.stringify({ items: currentItems, clientNombre: currentClient.nombre, priceListId: currentPriceList, savedAt: Date.now() }))
    } catch {}
  }, [])

  const clearDraft = useCallback((uid: string) => { try { localStorage.removeItem(k(LS_BASE_KEYS.draft, uid)) } catch {} }, [])

  const scheduleDraftSave = useCallback((currentItems: LineItem[], currentClient: ClientData, currentPriceList: PriceListId, uid: string) => {
    if (draftSaveTimer.current) window.clearTimeout(draftSaveTimer.current)
    draftSaveTimer.current = window.setTimeout(() => saveDraft(currentItems, currentClient, currentPriceList, uid), 800)
  }, [saveDraft])

  useEffect(() => { createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? "")) }, [])

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: profile } = await supabase.from("profiles").select("next_remito_number, selected_price_list").eq("id", userId).single()
        if (profile?.next_remito_number && Number(profile.next_remito_number) > 0) setNextNumber(Number(profile.next_remito_number))
        const sel = profile?.selected_price_list
        if (sel === "minorista" || sel === "mayorista" || sel === "oferta") setPriceListId(sel)
        const raw = localStorage.getItem(k(LS_BASE_KEYS.productsCache, userId))
        if (raw) {
          const parsed = JSON.parse(raw) as Record<PriceListId, ProductsCacheEntry>
          if (parsed?.minorista && parsed?.mayorista && parsed?.oferta) productsCacheRef.current = parsed
        }
        if (!draftRestoredRef.current) {
          draftRestoredRef.current = true
          const rawDraft = localStorage.getItem(k(LS_BASE_KEYS.draft, userId))
          if (rawDraft) {
            const draft = JSON.parse(rawDraft) as DraftData
            const draftDate = new Date(draft.savedAt).toISOString().slice(0, 10)
            if (draft.items?.length > 0 && draftDate === getTodayISODate()) {
              setItems(draft.items)
              setClient((prev) => ({ ...prev, nombre: draft.clientNombre || "" }))
              if (draft.priceListId) setPriceListId(draft.priceListId)
              setShowDraftBanner(true)
            } else { localStorage.removeItem(k(LS_BASE_KEYS.draft, userId)) }
          }
        }
      } catch {}
    }
    load()
  }, [userId])

  useEffect(() => { if (!userId || !draftRestoredRef.current) return; scheduleDraftSave(items, client, priceListId, userId) }, [items, client, priceListId, userId, scheduleDraftSave])

 useEffect(() => {
  if (!userId) return

  const updateProfile = async () => {
    const { error } = await createClient()
      .from("profiles")
      .update({ selected_price_list: priceListId })
      .eq("id", userId)

    if (error) {
      console.error("Error updating profile:", error)
    }
  }

  updateProfile()
}, [priceListId, userId])

  const saveProductsCache = useCallback((cache: Record<PriceListId, ProductsCacheEntry>) => {
    if (!userId) return
    try { localStorage.setItem(k(LS_BASE_KEYS.productsCache, userId), JSON.stringify(cache)) } catch {}
  }, [userId])

  useEffect(() => {
    const controller = new AbortController()
    const loadProducts = async () => {
      const cached = productsCacheRef.current[priceListId]
      if (cached?.products?.length > 0) { setProducts(cached.products); return }
      try {
        setIsLoadingProducts(true)
        const res = await fetch(`/api/products-csv?list=${priceListId}`, { cache: "force-cache", signal: controller.signal })
        if (!res.ok) throw new Error()
        const parsed = parseCSV(await res.text())
        const nextCache = { ...productsCacheRef.current, [priceListId]: { loadedAt: Date.now(), products: parsed } }
        productsCacheRef.current = nextCache
        saveProductsCache(nextCache)
        startTransition(() => setProducts(parsed))
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return
        if (!productsCacheRef.current[priceListId]?.products?.length) startTransition(() => setProducts([]))
      } finally { setIsLoadingProducts(false) }
    }
    loadProducts()
    return () => controller.abort()
  }, [priceListId, saveProductsCache])

  const remitoNumero = useMemo(() => formatRemitoNumber(nextNumber), [nextNumber])
  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])
  const totalUnits = useMemo(() => items.reduce((s, i) => s + i.cantidad, 0), [items])
  const remitoData: RemitoData = useMemo(() => ({ numero: remitoNumero, fecha: remitoDateRef.current, client, items, subtotal: total, total }), [remitoNumero, client, items, total])

  const canPrint = items.length > 0
  const hasDraft = items.length > 0 || client.nombre.trim().length > 0
  const actionBarPx = canPrint ? actionBarCollapsed ? ACTION_BAR_COLLAPSED_PX : ACTION_BAR_EXPANDED_PX : 0

  const handleItemsChange = useCallback<React.Dispatch<React.SetStateAction<LineItem[]>>>((updater) => {
    setItems((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      const prevMap = new Map(prev.map((item) => [`${item.product.descripcion}||${item.opcion ?? ""}`, item.cantidad]))
      for (const item of next) {
        const key = `${item.product.descripcion}||${item.opcion ?? ""}`
        if (item.cantidad > (prevMap.get(key) ?? 0)) { showToast(buildAddedToast(item.product, item.opcion)); break }
      }
      return next
    })
  }, [showToast])

  const advanceAndReset = useCallback((nextVisibleNumber: number, successData: SuccessState) => {
    setSuccessState(successData); setNextNumber(nextVisibleNumber); setClient(defaultClient); setItems([])
    setActionBarCollapsed(false); setShowDraftBanner(false); clearDraft(userId); remitoDateRef.current = getTodayDateSafe()
  }, [userId, clearDraft])

  const persistRemito = useCallback(async (): Promise<{ nextNumber: number; remitoId: string } | null> => {
    if (!isOnline) { showToast("Sin internet"); return null }
    if (!userId) { showToast("Falta sesión"); return null }
    if (items.length === 0) { showToast("No hay productos"); return null }
    try {
      setIsSaving(true)
      const supabase = createClient()
      const { data: consumedNumber, error: consumeError } = await supabase.rpc("consume_next_remito_number")
      if (consumeError || typeof consumedNumber !== "number") { showToast("Error al generar número"); return null }
      const { data: remitoInserted, error: remitoError } = await supabase.from("remitos").insert({
        user_id: userId, numero_remito: formatRemitoNumber(consumedNumber), fecha: getTodayISODate(),
        cliente_nombre: client.nombre?.trim() || null, estado: "pendiente", observaciones: null, price_list_id: priceListId, total,
      }).select("id").single()
      if (remitoError || !remitoInserted) { showToast("Error al guardar"); return null }
      const { error: itemsError } = await supabase.from("remito_items").insert(
        items.map((item) => ({ remito_id: remitoInserted.id, descripcion: item.product.descripcion, cantidad: item.cantidad, precio_unitario: item.product.precio, subtotal: item.subtotal, opcion: item.opcion || null }))
      )
      if (itemsError) { showToast("Error al guardar items"); return null }
      return { nextNumber: consumedNumber + 1, remitoId: remitoInserted.id }
    } catch { showToast("Error al guardar"); return null }
    finally { setIsSaving(false) }
  }, [isOnline, userId, items, client.nombre, priceListId, total, showToast])

  const buildPrintHtml = useCallback(() => {
    const printable = document.getElementById("printable-remito")
    if (!printable) return null
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map((el) => el.outerHTML).join("\n")
    return `<!doctype html><html><head><meta charset="utf-8"/><title>Remito</title>${styles}<style>@page{size:58mm auto;margin:0}html,body{margin:0;padding:0;width:58mm;background:#fff;color:#000;font-family:monospace}.topbar{display:flex;gap:8px;justify-content:flex-end;padding:10px 8px;background:#fff;border-bottom:1px solid #ddd}.btn{min-height:44px;padding:0 14px;border-radius:12px;border:1px solid #d0d0d0;background:#fff;color:#111;font-size:14px;font-weight:600;display:inline-flex;align-items:center}.btn-primary{background:#111;color:#fff;border-color:#111}.sheet{width:48mm;margin:0 auto}@media print{.topbar{display:none!important}}</style></head><body><div class="topbar"><button class="btn" id="btnClose">Cerrar</button><button class="btn btn-primary" id="btnPrint">Imprimir</button></div><div class="sheet">${printable.outerHTML}</div><script>document.getElementById("btnPrint").onclick=()=>window.print();document.getElementById("btnClose").onclick=()=>window.history.length>1?window.history.back():window.close()<\/script></body></html>`
  }, [])

  const openPrintWindowImmediate = useCallback(() => {
    const html = buildPrintHtml(); if (!html) return null
    const win = window.open("", "_blank"); if (!win) return null
    win.document.open(); win.document.write(html); win.document.close(); win.focus(); return win
  }, [buildPrintHtml])

  const handlePreviewPrint = useCallback(async () => {
    if (!isOnline || !canPrint || isSaving || isPrintingBluetooth) return
    const successData = { numero: remitoNumero, cliente: client.nombre?.trim() || "Sin cliente", total, unidades: totalUnits }
    setShowPreview(false)
    const printWindow = isIOS() ? openPrintWindowImmediate() : null
    if (isIOS() && !printWindow) { showToast("No se pudo abrir impresión"); return }
    if (!isIOS()) window.print()
    const result = await persistRemito()
    if (!result) return
    advanceAndReset(result.nextNumber, { ...successData, remitoId: result.remitoId })
  }, [isOnline, canPrint, isSaving, isPrintingBluetooth, remitoNumero, client.nombre, total, totalUnits, openPrintWindowImmediate, persistRemito, advanceAndReset, showToast])

  const handleBluetoothPrint = useCallback(async () => {
    if (!isOnline || !canPrint || isSaving || isPrintingBluetooth) return
    const successData = { numero: remitoNumero, cliente: client.nombre?.trim() || "Sin cliente", total, unidades: totalUnits }
    try {
      setIsPrintingBluetooth(true); showToast("Buscando impresora...")
      const payload = buildRemitoEscPos(remitoData)
      const { device, characteristic } = await connectBlePrinter()
      showToast(`Conectado a ${device.name?.trim() || "impresora"}. Enviando...`)
      try { await writeEscPos(characteristic, payload) } finally { await disconnectBlePrinter(device) }
      const result = await persistRemito()
      if (!result) return
      advanceAndReset(result.nextNumber, { ...successData, remitoId: result.remitoId })
    } catch (error) {
      const msg = error instanceof Error ? error.message : ""
      if (/bluetooth no disponible/i.test(msg)) { showToast("BT no disponible en este celu"); return }
      if (/no se pudo abrir/i.test(msg)) { showToast("¿La impresora está encendida y cerca?"); return }
      if (/no parece compatible/i.test(msg)) { showToast("La impresora no es compatible"); return }
      showToast("No se pudo conectar con la impresora")
    } finally { setIsPrintingBluetooth(false) }
  }, [isOnline, canPrint, isSaving, isPrintingBluetooth, remitoNumero, client.nombre, total, totalUnits, remitoData, persistRemito, advanceAndReset, showToast])

  const confirmNewRemito = useCallback(() => {
    setClient(defaultClient); setItems([]); setShowConfirmNew(false); setShowDraftBanner(false)
    setActionBarCollapsed(false); clearDraft(userId); showToast("Nuevo remito listo")
  }, [showToast, userId, clearDraft])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#1565c0] text-white">
            <FileText className="size-4" />
          </div>
          <p className="text-sm font-medium text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // ── PANTALLA DE ÉXITO ──────────────────────────────────────────────────
  if (successState) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut" }} className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="size-8 text-green-600" />
          </div>
          <h1 className="text-[22px] font-semibold text-gray-900">Ticket enviado</h1>
          <p className="mt-1 text-[13px] text-gray-500">{successState.numero}</p>
          <div className="mt-5 rounded-xl border border-gray-200 bg-white px-4 py-4 text-left shadow-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-[12px] text-gray-500">Cliente</span>
              <span className="text-[13px] font-medium text-gray-900">{successState.cliente}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-[12px] text-gray-500">Unidades</span>
              <span className="text-[13px] font-medium text-gray-900">{successState.unidades}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[12px] text-gray-500">Total</span>
              <span className="text-[15px] font-semibold text-gray-900 tabular-nums">{formatCurrency(successState.total)}</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => router.push(`/dashboard/${successState.remitoId}`)} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-[13px] font-medium text-gray-600 active:opacity-60 shadow-sm">
              <Eye className="size-3.5" />Ver pedido
            </button>
            <button type="button" onClick={() => setSuccessState(null)} className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-[#1565c0] text-[14px] font-semibold text-white active:opacity-80 shadow-sm">
              <Plus className="size-4" />Nuevo pedido
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen overflow-x-hidden bg-gray-100">

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400">{remitoNumero} · {remitoDateRef.current}</p>
            </div>
            <div className="relative shrink-0">
              <select
                value={priceListId}
                onChange={(e) => setPriceListId(e.target.value as PriceListId)}
                className="h-8 appearance-none rounded-lg border border-gray-300 bg-gray-50 px-2.5 pr-6 text-[13px] font-medium text-gray-700 outline-none focus:border-[#1565c0]"
              >
                {PRICE_LISTS.map((l) => (<option key={l.id} value={l.id}>{l.label}</option>))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              type="button"
              onClick={() => hasDraft ? setShowConfirmNew(true) : confirmNewRemito()}
              className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 text-[12px] font-medium text-gray-600 active:opacity-60"
            >
              <Plus className="size-3" />Nuevo
            </button>
          </div>

          <AnimatePresence>
            {!isOnline && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-4 py-2.5">
                  <WifiOff className="size-3.5 shrink-0 text-red-500" />
                  <p className="text-[12px] font-semibold text-red-600">Sin internet — no podés imprimir hasta recuperar señal</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {showDraftBanner && (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-1.5 flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-amber-700">Pedido anterior recuperado ({items.length} productos)</p>
              <button type="button" onClick={() => { setShowDraftBanner(false); setShowConfirmNew(true) }} className="text-[11px] text-amber-600 underline active:opacity-60 shrink-0">Descartar</button>
            </div>
          )}
        </header>

        {/* ── CONTENIDO ── */}
        <main className="mx-auto w-full max-w-md px-4 pt-3" style={{ paddingBottom: `calc(${BOTTOM_NAV_PX + actionBarPx}px + env(safe-area-inset-bottom) + 16px)` }}>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Nombre del cliente (opcional)"
              value={client.nombre}
              onChange={(e) => setClient((prev) => ({ ...prev, nombre: e.target.value }))}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#1565c0] shadow-sm"
            />
          </div>

          {isLoadingProducts && products.length === 0 ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />)}
            </div>
          ) : (
            <ProductSelector products={products} items={items} onItemsChange={handleItemsChange} />
          )}
        </main>

        {/* ── BARRA DE ACCIÓN ── */}
        <AnimatePresence>
          {canPrint && (
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-x-0 z-50 border-t border-gray-200 bg-white shadow-lg"
              style={{ bottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
            >
              <button type="button" onClick={() => setActionBarCollapsed((v) => !v)} className="flex w-full items-center justify-center py-1.5 active:opacity-60">
                <div className="flex items-center gap-1.5">
                  <div className="h-0.5 w-6 rounded-full bg-gray-300" />
                  {actionBarCollapsed ? <ChevronUp className="size-3 text-gray-400" /> : <ChevronDown className="size-3 text-gray-400" />}
                  <div className="h-0.5 w-6 rounded-full bg-gray-300" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {!actionBarCollapsed && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="overflow-hidden">
                    <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 pb-3">

                      {/* Total */}
                      <div className="min-w-0 flex-1">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                          <span className="text-[11px] font-medium text-gray-500">Total</span>
                          <span className="text-[15px] font-bold text-gray-900 tabular-nums leading-none">{formatCurrency(total)}</span>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[11px] font-medium text-gray-400">{totalUnits} u.</span>
                        </div>
                      </div>

                      {/* Ver */}
                      <button type="button" onClick={() => setShowPreview(true)} className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-600 active:opacity-60 shadow-sm">
                        <Eye className="size-3.5" />Ver
                      </button>

                      {/* Imprimir / Sin señal */}
                      {!isOnline ? (
                        <div className="flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-500">
                          <WifiOff className="size-3.5" />Sin señal
                        </div>
                      ) : (
                        <button type="button" onClick={handleBluetoothPrint} disabled={isSaving || isPrintingBluetooth} className="flex h-10 items-center gap-1.5 rounded-xl bg-[#1565c0] px-4 text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-40 shadow-sm">
                          {isPrintingBluetooth ? <Loader2 className="size-3.5 animate-spin" /> : <Bluetooth className="size-3.5" />}
                          {isPrintingBluetooth ? "Conectando..." : "Imprimir"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TOAST ── */}
        <AnimatePresence>
          {toast.open && (
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.18 }}
              className="fixed left-1/2 z-[60] w-[calc(100%-32px)] max-w-sm -translate-x-1/2"
              style={{ bottom: `calc(${BOTTOM_NAV_PX + actionBarPx}px + env(safe-area-inset-bottom) + 10px)` }}
              role="alert"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-lg">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1565c0] text-white">
                  <CheckCircle2 className="size-3" />
                </div>
                <p className="text-[13px] font-medium text-gray-800">{toast.text}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── MODAL: Ver ticket ── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent showCloseButton={false} className="fixed left-1/2 top-1/2 z-50 flex h-[100dvh] w-screen max-w-none -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-none border-0 bg-gray-100 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-sm sm:rounded-2xl sm:border sm:border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
            <p className="text-[13px] font-semibold text-gray-900">Vista previa</p>
            <button type="button" onClick={() => setShowPreview(false)} className="text-[12px] text-gray-400 active:opacity-60">Cerrar</button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-300 px-4 py-4">
            <div className="mx-auto w-fit overflow-hidden rounded-xl bg-white shadow-sm">
              <RemitoPrint data={remitoData} />
            </div>
          </div>
          <div className="border-t border-gray-200 bg-white px-4 py-2.5">
            <button type="button" onClick={handlePreviewPrint} disabled={!isOnline || isSaving || isPrintingBluetooth} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1565c0] text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-40">
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
              {isSaving ? "Imprimiendo..." : "Imprimir"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Confirmar nuevo remito ── */}
      <Dialog open={showConfirmNew} onOpenChange={setShowConfirmNew}>
        <DialogContent className="max-w-sm rounded-2xl border-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-semibold text-gray-900">Nuevo remito</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-gray-500">Se limpia el pedido actual y empezás uno nuevo.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setShowConfirmNew(false)} className="flex h-10 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white text-[13px] font-medium text-gray-700 active:opacity-60">Cancelar</button>
            <button type="button" onClick={confirmNewRemito} className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[#1565c0] text-[13px] font-semibold text-white active:opacity-80">Continuar</button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="hidden" aria-hidden="true">
        <div id="printable-remito"><RemitoPrint data={remitoData} /></div>
      </div>
    </>
  )
}