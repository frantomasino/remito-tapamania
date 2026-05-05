"use client"

import { createClient } from "@/lib/supabase/client"
import type React from "react"
import { useState, useRef, useCallback, useEffect, useMemo, startTransition, useLayoutEffect } from "react"
import dynamic from "next/dynamic"
import {
  Printer, CheckCircle2, Loader2, Eye,
  Bluetooth, ChevronDown, ChevronUp, Plus, WifiOff,
  ClipboardList, PlusCircle, Settings2, CloudOff,
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RemitoPrint } from "@/components/remito-print"
import { connectBlePrinter, disconnectBlePrinter, writeEscPos } from "@/lib/bluetooth-printer"
import { buildRemitoEscPos } from "@/lib/remito-ticket-escpos"
import { cn } from "@/lib/utils"
import {
  type Product, type LineItem, type ClientData, type RemitoData,
  formatRemitoNumber, formatCurrency, parseCSV,
} from "@/lib/remito-types"

const ProductSelector = dynamic(
  () => import("@/components/product-selector").then(m => ({ default: m.ProductSelector })),
  { ssr: false }
)

type PriceListId = "minorista" | "mayorista" | "oferta"

const PRICE_LISTS: { id: PriceListId; label: string }[] = [
  { id: "minorista", label: "Minorista" },
  { id: "mayorista", label: "Mayorista" },
  { id: "oferta", label: "Oferta" },
]

const navItems = [
  { href: "/dashboard/pedidos", label: "Historial", icon: ClipboardList },
  { href: "/dashboard/nuevo", label: "Nuevo", icon: PlusCircle, primary: true },
  { href: "/dashboard/perfil", label: "Cuenta", icon: Settings2 },
]

const defaultClient: ClientData = { nombre: "", direccion: "", telefono: "", mail: "", formaPago: "" }

function getTodayDateSafe(): string {
  return new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}
function getTodayISODate(): string { return new Date().toISOString().slice(0, 10) }

const LS_BASE_KEYS = {
  productsCache: "productsCache",
  draft: "remitoDraft",
  pendingRemitos: "pendingRemitos",
} as const

function k(base: string, userId: string) { return `${base}:${userId}` }
function onboardingKey(userId: string) { return `onboarding_done:${userId}` }

const BOTTOM_NAV_PX = 72
const ACTION_BAR_PX = 60

type ProductsCacheEntry = { loadedAt: number; products: Product[] }
type DraftData = { items: LineItem[]; clientNombre: string; priceListId: PriceListId; savedAt: number }
type SuccessState = { remitoId: string | null; numero: string; cliente: string; total: number; unidades: number } | null

type PendingRemito = {
  id: string
  userId: string
  numeroRemito: string
  fecha: string
  clienteNombre: string | null
  priceListId: PriceListId
  total: number
  items: Array<{ descripcion: string; cantidad: number; precio_unitario: number; subtotal: number; opcion: string | null }>
  savedAt: number
}

function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

const ONBOARDING_STEPS = [
  { key: "empresa" as const, title: "¿Cómo se llama tu negocio?", subtitle: "Aparece en el encabezado del ticket impreso.", placeholder: "Ej: Tapamanía", emoji: "🏢", type: "text" },
  { key: "vendedor" as const, title: "¿Cuál es tu nombre?", subtitle: "Aparece en el ticket como vendedor.", placeholder: "Ej: Gustavo", emoji: "👤", type: "text" },
  { key: "telefono" as const, title: "¿Tu teléfono de contacto?", subtitle: "Se muestra en el ticket para que el cliente te contacte.", placeholder: "Ej: 11 1234-5678", emoji: "📞", type: "tel" },
  { key: "alias" as const, title: "¿Tu alias de Mercado Pago?", subtitle: "Se imprime en el ticket para que el cliente pueda transferirte.", placeholder: "Ej: tapamania.mp", emoji: "💳", type: "text" },
]

type OnboardingValues = { empresa: string; vendedor: string; telefono: string; alias: string }

export default function RemitoPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [userId, setUserId] = useState<string>("")
  const [empresa, setEmpresa] = useState<string>("")
  const [vendedor, setVendedor] = useState<string>("")
  const [telefono, setTelefono] = useState<string>("")
  const [aliasMP, setAliasMP] = useState<string>("")
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<LineItem[]>([])
  const [client, setClient] = useState<ClientData>(defaultClient)
  const [nextNumber, setNextNumber] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirmNew, setShowConfirmNew] = useState(false)
  const [successState, setSuccessState] = useState<SuccessState>(null)
  const [priceListId, setPriceListId] = useState<PriceListId>("minorista")
  const [mounted, setMounted] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPrintingBluetooth, setIsPrintingBluetooth] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [actionBarCollapsed, setActionBarCollapsed] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastText, setToastText] = useState("")
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [onboardingValues, setOnboardingValues] = useState<OnboardingValues>({ empresa: "", vendedor: "", telefono: "", alias: "" })
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false)

  const remitoDateRef = useRef<string>(getTodayDateSafe())
  const toastTimer = useRef<number | null>(null)
  const draftSaveTimer = useRef<number | null>(null)
  const draftRestoredRef = useRef(false)

  const supabase = useMemo(() => createClient(), [])
  const itemsRef = useRef(items)
  const clientRef = useRef(client)
  const priceListIdRef = useRef(priceListId)
  useLayoutEffect(() => { itemsRef.current = items }, [items])
  useLayoutEffect(() => { clientRef.current = client }, [client])
  useLayoutEffect(() => { priceListIdRef.current = priceListId }, [priceListId])

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
    setToastText(text); setToastVisible(true)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 1900)
  }, [])

  const handleOnboardingSkip = useCallback(() => {
    if (userId) localStorage.setItem(onboardingKey(userId), "1")
    setShowOnboarding(false)
  }, [userId])

  const handleOnboardingNext = useCallback(async () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) { setOnboardingStep(prev => prev + 1); return }
    try {
      setIsSavingOnboarding(true)
      await supabase.from("profiles").update({
        empresa: onboardingValues.empresa.trim() || null,
        vendedor: onboardingValues.vendedor.trim() || null,
        telefono: onboardingValues.telefono.trim() || null,
        alias: onboardingValues.alias.trim() || null,
      }).eq("id", userId)
      if (onboardingValues.empresa.trim()) setEmpresa(onboardingValues.empresa.trim())
      if (onboardingValues.vendedor.trim()) setVendedor(onboardingValues.vendedor.trim())
      if (onboardingValues.telefono.trim()) setTelefono(onboardingValues.telefono.trim())
      if (onboardingValues.alias.trim()) setAliasMP(onboardingValues.alias.trim())
      localStorage.setItem(onboardingKey(userId), "1")
      setShowOnboarding(false)
      showToast("¡Todo listo! Ya podés crear tu primer remito")
    } catch { showToast("Error al guardar, intentá de nuevo") }
    finally { setIsSavingOnboarding(false) }
  }, [onboardingStep, onboardingValues, userId, supabase, showToast])

  const loadPendingCount = useCallback((uid: string) => {
    try {
      const raw = localStorage.getItem(k(LS_BASE_KEYS.pendingRemitos, uid))
      if (!raw) { setPendingCount(0); return }
      setPendingCount((JSON.parse(raw) as PendingRemito[]).length)
    } catch { setPendingCount(0) }
  }, [])

  const savePendingRemito = useCallback((pending: PendingRemito, uid: string) => {
    try {
      const raw = localStorage.getItem(k(LS_BASE_KEYS.pendingRemitos, uid))
      const existing = raw ? (JSON.parse(raw) as PendingRemito[]) : []
      existing.push(pending)
      localStorage.setItem(k(LS_BASE_KEYS.pendingRemitos, uid), JSON.stringify(existing))
      setPendingCount(existing.length)
    } catch {}
  }, [])

  const syncPendingRemitos = useCallback(async (uid: string) => {
    if (!uid) return
    try {
      const raw = localStorage.getItem(k(LS_BASE_KEYS.pendingRemitos, uid))
      if (!raw) return
      const pending = JSON.parse(raw) as PendingRemito[]
      if (pending.length === 0) return
      setIsSyncing(true)
      const synced: string[] = []
      for (const remito of pending) {
        try {
          const { data: consumedNumber, error: consumeError } = await supabase.rpc("consume_next_remito_number")
          if (consumeError || typeof consumedNumber !== "number") continue
          const { data: remitoInserted, error: remitoError } = await supabase.from("remitos").insert({
            user_id: uid, numero_remito: formatRemitoNumber(consumedNumber), fecha: remito.fecha,
            cliente_nombre: remito.clienteNombre, estado: "pendiente", observaciones: null,
            price_list_id: remito.priceListId, total: remito.total,
          }).select("id").single()
          if (remitoError || !remitoInserted) continue
          const { error: itemsError } = await supabase.from("remito_items").insert(
            remito.items.map((item) => ({ remito_id: remitoInserted.id, descripcion: item.descripcion, cantidad: item.cantidad, precio_unitario: item.precio_unitario, subtotal: item.subtotal, opcion: item.opcion }))
          )
          if (!itemsError) synced.push(remito.id)
        } catch {}
      }
      if (synced.length > 0) {
        const remaining = pending.filter(r => !synced.includes(r.id))
        localStorage.setItem(k(LS_BASE_KEYS.pendingRemitos, uid), JSON.stringify(remaining))
        setPendingCount(remaining.length)
        showToast(`${synced.length} remito${synced.length > 1 ? "s" : ""} sincronizado${synced.length > 1 ? "s" : ""}`)
      }
    } catch {} finally { setIsSyncing(false) }
  }, [supabase, showToast])

  useEffect(() => { if (isOnline && userId) syncPendingRemitos(userId) }, [isOnline, userId, syncPendingRemitos])

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

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? "")) }, [supabase])

  useEffect(() => {
    if (!userId) return
    loadPendingCount(userId)
    const load = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("next_remito_number, selected_price_list, empresa, vendedor, telefono, alias")
          .eq("id", userId).single()
        if (profile?.next_remito_number && Number(profile.next_remito_number) > 0) setNextNumber(Number(profile.next_remito_number))
        if (profile?.empresa) setEmpresa(profile.empresa)
        if (profile?.vendedor) setVendedor(profile.vendedor)
        if (profile?.telefono) setTelefono(profile.telefono)
        if (profile?.alias) setAliasMP(profile.alias)
        const onboardingDone = localStorage.getItem(onboardingKey(userId))
        if (!profile?.empresa && !onboardingDone) setShowOnboarding(true)
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
            } else { localStorage.removeItem(k(LS_BASE_KEYS.draft, userId)) }
          }
        }
      } catch {}
    }
    load()
  }, [userId, supabase, loadPendingCount])

  useEffect(() => { if (!userId || !draftRestoredRef.current) return; scheduleDraftSave(items, client, priceListId, userId) }, [items, client, priceListId, userId, scheduleDraftSave])

  useEffect(() => {
    if (!userId) return
    void supabase.from("profiles").update({ selected_price_list: priceListId }).eq("id", userId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceListId, userId])

  const saveProductsCache = useCallback((cache: Record<PriceListId, ProductsCacheEntry>) => {
    if (!userId) return
    try { localStorage.setItem(k(LS_BASE_KEYS.productsCache, userId), JSON.stringify(cache)) } catch {}
  }, [userId])

  useEffect(() => {
    const controller = new AbortController()
    const CACHE_TTL_MS = 30 * 60 * 1000
    const loadProducts = async () => {
      const cached = productsCacheRef.current[priceListId]
      const isStale = !cached.loadedAt || (Date.now() - cached.loadedAt) > CACHE_TTL_MS
      if (cached?.products?.length > 0 && !isStale) { setProducts(cached.products); return }
      try {
        setIsLoadingProducts(true)
        const res = await fetch(`/api/products-csv?list=${priceListId}`, { cache: "no-store", signal: controller.signal })
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
  const totalDev = useMemo(() => items.reduce((s, i) => s + (i.devolucion ?? 0), 0), [items])
  const remitoData: RemitoData = useMemo(() => ({ numero: remitoNumero, fecha: remitoDateRef.current, client, items, subtotal: total, total }), [remitoNumero, client, items, total])

  const canPrint = items.filter(i => i.cantidad > 0).length > 0
  const hasDraft = items.length > 0 || client.nombre.trim().length > 0
  const fixedBottomPx = BOTTOM_NAV_PX + (canPrint ? (actionBarCollapsed ? 12 : ACTION_BAR_PX) : 0)

  useEffect(() => {
    if (canPrint) setActionBarCollapsed(false)
    else setActionBarCollapsed(true)
  }, [canPrint])

  const handleItemsChange = useCallback<React.Dispatch<React.SetStateAction<LineItem[]>>>((updater) => {
    setItems((prev) => typeof updater === "function" ? updater(prev) : updater)
  }, [])

  const advanceAndReset = useCallback((nextVisibleNumber: number, successData: SuccessState) => {
    setSuccessState(successData); setNextNumber(nextVisibleNumber); setClient(defaultClient); setItems([])
    clearDraft(userId); remitoDateRef.current = getTodayDateSafe()
  }, [userId, clearDraft])

  const persistRemito = useCallback(async (): Promise<{ nextNumber: number; remitoId: string } | null> => {
    if (!isOnline) { showToast("Sin internet"); return null }
    if (!userId) { showToast("Falta sesión"); return null }
    const currentItems = itemsRef.current; const currentClient = clientRef.current
    const currentPriceListId = priceListIdRef.current
    const currentTotal = currentItems.reduce((s, i) => s + i.subtotal, 0)
    if (currentItems.filter(i => i.cantidad > 0).length === 0) { showToast("No hay productos"); return null }
    try {
      setIsSaving(true)
      const { data: consumedNumber, error: consumeError } = await supabase.rpc("consume_next_remito_number")
      if (consumeError || typeof consumedNumber !== "number") { showToast("Error al generar número"); return null }
      const { data: remitoInserted, error: remitoError } = await supabase.from("remitos").insert({
        user_id: userId, numero_remito: formatRemitoNumber(consumedNumber), fecha: getTodayISODate(),
        cliente_nombre: currentClient.nombre?.trim() || null, estado: "pendiente", observaciones: null, price_list_id: currentPriceListId, total: currentTotal,
      }).select("id").single()
      if (remitoError || !remitoInserted) { showToast("Error al guardar"); return null }
      const { error: itemsError } = await supabase.from("remito_items").insert(
        currentItems.filter(i => i.cantidad > 0).map((item) => ({ remito_id: remitoInserted.id, descripcion: item.product.descripcion, cantidad: item.cantidad, precio_unitario: item.product.precio, subtotal: item.subtotal, opcion: item.opcion || null }))
      )
      if (itemsError) { showToast("Error al guardar items"); return null }
      return { nextNumber: consumedNumber + 1, remitoId: remitoInserted.id }
    } catch { showToast("Error al guardar"); return null }
    finally { setIsSaving(false) }
  }, [isOnline, userId, supabase, showToast])

  const persistRemitoOffline = useCallback(() => {
    if (!userId) return null
    const currentItems = itemsRef.current; const currentClient = clientRef.current
    const currentPriceListId = priceListIdRef.current
    const currentTotal = currentItems.reduce((s, i) => s + i.subtotal, 0)
    const pending: PendingRemito = {
      id: generateLocalId(), userId, numeroRemito: remitoNumero, fecha: getTodayISODate(),
      clienteNombre: currentClient.nombre?.trim() || null, priceListId: currentPriceListId, total: currentTotal,
      items: currentItems.filter(i => i.cantidad > 0).map(item => ({
        descripcion: item.product.descripcion, cantidad: item.cantidad,
        precio_unitario: item.product.precio, subtotal: item.subtotal, opcion: item.opcion || null,
      })),
      savedAt: Date.now(),
    }
    savePendingRemito(pending, userId)
    return { numero: remitoNumero, localId: pending.id }
  }, [userId, remitoNumero, savePendingRemito])

  const buildPrintHtml = useCallback(() => {
    const _empresa = empresa; const _vendedor = vendedor; const _telefono = telefono
    const _alias = aliasMP; const _numero = remitoNumero; const _fecha = remitoDateRef.current
    const items = itemsRef.current; const client = clientRef.current
    const total = items.reduce((s, i) => s + i.subtotal, 0)
    const totalUnidades = items.reduce((s, i) => s + i.cantidad, 0)
    const totalDevolucion = items.reduce((s, i) => s + (i.devolucion ?? 0), 0)
    const comercio = client.nombre?.trim() || "Sin especificar"
    const groups = new Map<string, { title: string; precio: number; totalCantidad: number; totalSubtotal: number; totalDevolucion: number; opciones: Array<{opcion: string; cantidad: number; devolucion: number}>; hasOpciones: boolean }>()
    for (const item of items) {
      const baseDesc = item.product.descripcion
      const title = baseDesc.replace(/\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim()
      if (groups.has(baseDesc)) {
        const g = groups.get(baseDesc)!
        g.totalCantidad += item.cantidad; g.totalSubtotal += item.subtotal; g.totalDevolucion += item.devolucion ?? 0
        if (item.opcion) { g.opciones.push({ opcion: item.opcion, cantidad: item.cantidad, devolucion: item.devolucion ?? 0 }); g.hasOpciones = true }
      } else {
        groups.set(baseDesc, { title, precio: item.product.precio, totalCantidad: item.cantidad, totalSubtotal: item.subtotal, totalDevolucion: item.devolucion ?? 0, opciones: item.opcion ? [{ opcion: item.opcion, cantidad: item.cantidad, devolucion: item.devolucion ?? 0 }] : [], hasOpciones: !!item.opcion })
      }
    }
    const fmt = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
    const itemsHtml = Array.from(groups.values()).map(g => `
      <div style="border-bottom:1px dashed #000;padding:3px 0;">
        <div style="font-weight:bold;">${g.title} <span style="font-weight:normal;">x${g.totalCantidad}</span></div>
        ${g.hasOpciones ? `<div style="font-size:9px;color:#666;">${g.opciones.filter(o=>o.cantidad>0).map(o=>`${o.opcion} ${o.cantidad}`).join(", ")}</div>` : ""}
        ${g.totalDevolucion > 0 ? `<div style="font-size:9px;">Dev: ${g.hasOpciones ? g.opciones.filter(o=>o.devolucion>0).map(o=>`${o.devolucion} ${o.opcion}`).join(", ") : g.totalDevolucion}</div>` : ""}
        <div style="display:flex;justify-content:space-between;"><span>${g.totalCantidad} x ${fmt(g.precio)}</span><span style="font-weight:bold;">${fmt(g.totalSubtotal)}</span></div>
      </div>`).join("")
    return `<!doctype html><html><head><meta charset="utf-8"/><title>Remito</title>
    <style>@page{size:58mm auto;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:monospace;font-size:10px;background:#fff;color:#000;width:58mm;}.topbar{display:flex;gap:8px;justify-content:flex-end;padding:10px 8px;background:#fff;border-bottom:1px solid #ddd;}.btn{min-height:44px;padding:0 14px;border-radius:12px;border:1px solid #d0d0d0;background:#fff;color:#111;font-size:14px;font-weight:600;display:inline-flex;align-items:center;cursor:pointer;}.btn-primary{background:#111;color:#fff;border-color:#111;}.sheet{width:48mm;margin:0 auto;padding:2mm;}.center{text-align:center;}.row{display:flex;justify-content:space-between;margin-top:2px;}@media print{.topbar{display:none!important}}</style></head>
    <body><div class="topbar"><button class="btn" id="btnClose">Cerrar</button><button class="btn btn-primary" id="btnPrint">Imprimir</button></div>
    <div class="sheet">
      <div class="center" style="border-bottom:1px dashed #000;padding-bottom:3px;">
        <div style="font-weight:bold;font-size:12px;text-transform:uppercase;">${_empresa || "Remito"}</div>
        ${_telefono ? `<div style="font-size:9px;">${_telefono}</div>` : ""}
        ${_alias ? `<div style="font-weight:bold;font-size:11px;font-style:italic;">Alias: ${_alias}</div>` : ""}
        <div style="font-weight:bold;margin-top:2px;">Remito - Pedido</div>
        <div>N° ${_numero}</div><div>${_fecha}</div>
      </div>
      <div style="border-bottom:1px dashed #000;padding:3px 0;">
        <div class="row"><span style="font-weight:bold;">Comercio:</span><span>${comercio}</span></div>
        ${_vendedor ? `<div class="row"><span style="font-weight:bold;">Vendedor:</span><span>${_vendedor}</span></div>` : ""}
        <div class="row"><span style="font-weight:bold;">Items:</span><span>${groups.size}</span></div>
        <div class="row"><span style="font-weight:bold;">Unidades:</span><span>${totalUnidades}</span></div>
        ${totalDevolucion > 0 ? `<div class="row"><span style="font-weight:bold;">Devoluciones:</span><span>${totalDevolucion}</span></div>` : ""}
      </div>
      <div style="border-bottom:1px dashed #000;padding:3px 0;"><div class="row" style="font-weight:bold;"><span>Producto</span><span>Subtotal</span></div></div>
      ${itemsHtml}
      <div style="border-top:1px dashed #000;padding-top:3px;">
        <div class="row"><span>Subtotal</span><span>${fmt(total)}</span></div>
        <div class="row" style="font-weight:bold;font-size:12px;"><span>TOTAL</span><span>${fmt(total)}</span></div>
      </div>
      <div class="center" style="padding-top:4px;font-size:9px;">Gracias</div>
    </div>
    <script>document.getElementById("btnPrint").onclick=()=>window.print();document.getElementById("btnClose").onclick=()=>window.history.length>1?window.history.back():window.close()<\/script>
    </body></html>`
  }, [empresa, vendedor, telefono, aliasMP, remitoNumero])

  const openPrintWindowImmediate = useCallback(() => {
    const html = buildPrintHtml(); if (!html) return null
    const win = window.open("", "_blank"); if (!win) return null
    win.document.open(); win.document.write(html); win.document.close(); win.focus(); return win
  }, [buildPrintHtml])

  const handlePreviewPrint = useCallback(async () => {
    if (!isOnline || !canPrint || isSaving || isPrintingBluetooth) return
    const successData = { numero: remitoNumero, cliente: clientRef.current.nombre?.trim() || "Sin cliente", total, unidades: totalUnits }
    setShowPreview(false)
    const printWindow = openPrintWindowImmediate()
    if (!printWindow) { showToast("No se pudo abrir impresión"); return }
    const result = await persistRemito()
    if (!result) return
    advanceAndReset(result.nextNumber, { ...successData, remitoId: result.remitoId })
  }, [isOnline, canPrint, isSaving, isPrintingBluetooth, remitoNumero, total, totalUnits, openPrintWindowImmediate, persistRemito, advanceAndReset, showToast])

  const handleBluetoothPrint = useCallback(async () => {
    if (!canPrint || isSaving || isPrintingBluetooth) return
    const successData = { numero: remitoNumero, cliente: clientRef.current.nombre?.trim() || "Sin cliente", total, unidades: totalUnits }
    try {
      setIsPrintingBluetooth(true); showToast("Buscando impresora...")
      const payload = buildRemitoEscPos(remitoData, empresa, vendedor, telefono, aliasMP)
      const { device, characteristic } = await connectBlePrinter()
      showToast(`Conectado a ${device.name?.trim() || "impresora"}. Enviando...`)
      try { await writeEscPos(characteristic, payload) } finally { await disconnectBlePrinter(device) }
      if (isOnline) {
        const result = await persistRemito()
        if (!result) return
        advanceAndReset(result.nextNumber, { ...successData, remitoId: result.remitoId })
      } else {
        persistRemitoOffline(); setNextNumber(prev => prev + 1)
        advanceAndReset(nextNumber + 1, { ...successData, remitoId: null })
        showToast("Impreso. Se guardará cuando vuelva el internet")
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : ""
      if (/bluetooth no disponible/i.test(msg)) { showToast("BT no disponible en este celu"); return }
      if (/no se pudo abrir/i.test(msg)) { showToast("¿La impresora está encendida y cerca?"); return }
      if (/no parece compatible/i.test(msg)) { showToast("La impresora no es compatible"); return }
      showToast("No se pudo conectar con la impresora")
    } finally { setIsPrintingBluetooth(false) }
  }, [canPrint, isSaving, isPrintingBluetooth, remitoNumero, total, totalUnits, remitoData, empresa, vendedor, telefono, aliasMP, isOnline, persistRemito, persistRemitoOffline, advanceAndReset, nextNumber, showToast])

  const confirmNewRemito = useCallback(() => {
    setClient(defaultClient); setItems([]); setShowConfirmNew(false)
    clearDraft(userId); showToast("Nuevo remito listo")
  }, [showToast, userId, clearDraft])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm px-4 py-2.5">
          <div className="mx-auto flex w-full max-w-md items-center gap-2">
            <div className="flex-1 h-4 w-32 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-8 w-16 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-md px-4 pt-3 space-y-3">
          <div className="h-11 w-full animate-pulse rounded-xl bg-gray-200" />
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="px-3 divide-y divide-gray-100">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="py-3 flex items-center gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-200" />
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (successState) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-6">
        <div className="w-full max-w-sm text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="size-8 text-green-600" />
          </div>
          <h1 className="text-[22px] font-semibold text-gray-900">Ticket enviado</h1>
          <p className="mt-1 text-[13px] text-gray-500">{successState.numero}</p>
          {!successState.remitoId && (
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <CloudOff className="size-3.5 text-orange-500" />
              <p className="text-[12px] text-orange-500">Sin internet — se sincronizará automáticamente</p>
            </div>
          )}
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
            {successState.remitoId && (
              <button type="button" onClick={() => router.push(`/dashboard/${successState.remitoId}`)} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-[13px] font-medium text-gray-600 active:opacity-60 shadow-sm">
                <Eye className="size-3.5" />Ver pedido
              </button>
            )}
            <button type="button" onClick={() => setSuccessState(null)} className="flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-[#1565c0] text-[14px] font-semibold text-white active:opacity-80 shadow-sm">
              <Plus className="size-4" />Nuevo pedido
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentStep = ONBOARDING_STEPS[onboardingStep]

  return (
    <>
      {/* ── ONBOARDING — centrado con style inline para forzar posición ── */}
      {showOnboarding && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
          backgroundColor: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}>
          <div style={{
            width: "100%", maxWidth: "380px",
            borderRadius: "24px", backgroundColor: "white",
            overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          }}>
            {/* Header azul con logo y dots */}
            <div style={{ backgroundColor: "#1565c0", padding: "28px 24px 22px", textAlign: "center" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "14px",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 8px",
              }}>
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="2" width="14" height="2" rx="1" fill="white"/>
                  <rect x="2" y="7" width="10" height="2" rx="1" fill="white"/>
                  <rect x="2" y="12" width="12" height="2" rx="1" fill="white"/>
                </svg>
              </div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 14px" }}>Rutix</p>
              <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                {ONBOARDING_STEPS.map((_, i) => (
                  <div key={i} style={{
                    height: "6px", borderRadius: "3px", transition: "all 0.3s",
                    width: i === onboardingStep ? "24px" : "10px",
                    backgroundColor: i === onboardingStep ? "white" : i < onboardingStep ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
                  }} />
                ))}
              </div>
            </div>

            {/* Cuerpo */}
            <div style={{ padding: "24px" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "44px", marginBottom: "10px" }}>{currentStep.emoji}</div>
                <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#111827", margin: "0 0 6px", lineHeight: 1.3 }}>{currentStep.title}</h2>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>{currentStep.subtitle}</p>
              </div>

              <input
                key={currentStep.key}
                type={currentStep.type}
                placeholder={currentStep.placeholder}
                value={onboardingValues[currentStep.key]}
                onChange={(e) => setOnboardingValues(prev => ({ ...prev, [currentStep.key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleOnboardingNext() }}
                autoFocus
                style={{
                  display: "block", width: "100%", height: "48px",
                  borderRadius: "12px", border: "2px solid #e5e7eb",
                  backgroundColor: "#f9fafb", padding: "0 16px",
                  fontSize: "15px", color: "#111827", outline: "none",
                  boxSizing: "border-box", marginBottom: "12px", fontFamily: "inherit",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#1565c0"; e.target.style.backgroundColor = "white" }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.backgroundColor = "#f9fafb" }}
              />

              <button
                type="button"
                onClick={handleOnboardingNext}
                disabled={isSavingOnboarding}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "100%", height: "48px", borderRadius: "12px",
                  backgroundColor: "#1565c0", color: "white",
                  fontSize: "15px", fontWeight: 600, border: "none",
                  cursor: "pointer", fontFamily: "inherit", marginBottom: "8px",
                  opacity: isSavingOnboarding ? 0.6 : 1,
                }}
              >
                {isSavingOnboarding ? "Guardando..." : onboardingStep < ONBOARDING_STEPS.length - 1 ? "Continuar →" : "¡Empezar!"}
              </button>

              <button
                type="button"
                onClick={handleOnboardingSkip}
                style={{
                  display: "block", width: "100%", padding: "8px",
                  backgroundColor: "transparent", border: "none",
                  color: "#9ca3af", fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Completar después
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen overflow-x-hidden bg-gray-100">
        {/* HEADER */}
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400">{remitoNumero} · {remitoDateRef.current}</p>
            </div>
            {pendingCount > 0 && (
              <button type="button" onClick={() => isOnline && syncPendingRemitos(userId)} disabled={isSyncing}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 text-[11px] font-medium text-orange-600 active:opacity-60">
                {isSyncing ? <Loader2 className="size-3 animate-spin" /> : <CloudOff className="size-3" />}
                {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
              </button>
            )}
            <div className="relative shrink-0">
              <select value={priceListId} onChange={(e) => setPriceListId(e.target.value as PriceListId)}
                className="h-8 appearance-none rounded-lg border border-gray-300 bg-gray-50 px-2.5 pr-6 text-[13px] font-medium text-gray-700 outline-none focus:border-[#1565c0]">
                {PRICE_LISTS.map((l) => (<option key={l.id} value={l.id}>{l.label}</option>))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-gray-400" />
            </div>
            <button type="button" onClick={() => hasDraft ? setShowConfirmNew(true) : confirmNewRemito()}
              className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 text-[12px] font-medium text-gray-600 active:opacity-60">
              <Plus className="size-3" />Nuevo
            </button>
          </div>
          <div className={cn("overflow-hidden transition-all duration-150", isOnline ? "max-h-0" : "max-h-20")}>
            <div className="flex items-center gap-2 border-t border-orange-200 bg-orange-50 px-4 py-2.5">
              <WifiOff className="size-3.5 shrink-0 text-orange-500" />
              <p className="text-[12px] font-semibold text-orange-600">Sin internet — podés imprimir por bluetooth igual</p>
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="mx-auto w-full max-w-md px-4 pt-3"
          style={{ paddingBottom: `calc(${fixedBottomPx}px + env(safe-area-inset-bottom) + 24px)` }}>
          <div className="mb-3">
            <input type="text" placeholder="Nombre del cliente (opcional)"
              value={client.nombre} onChange={(e) => setClient((prev) => ({ ...prev, nombre: e.target.value }))}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#1565c0] shadow-sm" />
          </div>
          {isLoadingProducts && products.length === 0 ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />)}</div>
          ) : (
            <ProductSelector products={products} items={items} onItemsChange={handleItemsChange} />
          )}
        </main>

        {/* BLOQUE FIJO INFERIOR */}
        <div className="fixed inset-x-0 bottom-0 z-50 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
          {canPrint && (
            <div className="border-b border-gray-100">
              <div className={cn("overflow-hidden transition-all duration-200", actionBarCollapsed ? "max-h-0" : "max-h-24")}
                onClick={() => setActionBarCollapsed(true)}>
                <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 pb-3 pt-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-gray-900 tabular-nums leading-none">{formatCurrency(total)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {totalUnits} unid.
                      {totalDev > 0 && <span className="ml-1.5 text-orange-500">{totalDev} dev.</span>}
                    </p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setShowPreview(true) }}
                    className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-600 active:opacity-60">
                    <Eye className="size-3.5" />Ver
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleBluetoothPrint() }}
                    disabled={isSaving || isPrintingBluetooth}
                    className="flex h-10 items-center gap-1.5 rounded-xl bg-[#1565c0] px-4 text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-40">
                    {isPrintingBluetooth ? <Loader2 className="size-3.5 animate-spin" /> : <Bluetooth className="size-3.5" />}
                    {isPrintingBluetooth ? "Conectando..." : "Imprimir"}
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setActionBarCollapsed(v => !v)}
                className="flex w-full items-center justify-center gap-2 py-1 active:opacity-60">
                <div className="h-[2px] w-8 rounded-full bg-gray-200" />
                {actionBarCollapsed ? <ChevronUp className="size-3.5 text-gray-400" /> : <ChevronDown className="size-3.5 text-gray-400" />}
                <div className="h-[2px] w-8 rounded-full bg-gray-200" />
              </button>
            </div>
          )}
          <nav>
            <div className="mx-auto grid max-w-md grid-cols-3 items-center px-4 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1.5">
              {navItems.map((item) => {
                const isActive = item.href === "/dashboard/pedidos" ? pathname === "/dashboard/pedidos" : pathname.startsWith(item.href)
                if (item.primary) {
                  return (
                    <Link key={item.href} href={item.href} prefetch className="flex items-center justify-center">
                      <div className="flex h-9 w-20 flex-col items-center justify-center gap-0.5 rounded-xl bg-[#1565c0] text-white">
                        <item.icon className="size-4" />
                        <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                      </div>
                    </Link>
                  )
                }
                return (
                  <Link key={item.href} href={item.href} prefetch
                    {...(item.href === "/dashboard/pedidos" ? { "data-onboarding": "nav-pedidos" } : {})}
                    className="flex items-center justify-center active:opacity-60">
                    <div className={cn("flex h-9 w-20 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors", isActive ? "text-[#1565c0]" : "text-gray-400")}>
                      <item.icon className="size-4" />
                      <span className={cn("text-[10px] leading-none", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>

        {/* TOAST */}
        <div className={cn(
            "fixed left-1/2 z-[60] w-[calc(100%-32px)] max-w-sm -translate-x-1/2 transition-all duration-200",
            toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          )}
          style={{ bottom: `calc(${fixedBottomPx}px + env(safe-area-inset-bottom) + 10px)` }}
          role="alert">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-lg">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1565c0] text-white">
              <CheckCircle2 className="size-3" />
            </div>
            <p className="text-[13px] font-medium text-gray-800">{toastText}</p>
          </div>
        </div>
      </div>

      {/* MODAL: Ver ticket */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent showCloseButton={false} className="fixed left-1/2 top-1/2 z-50 flex h-[100dvh] w-screen max-w-none -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-none border-0 bg-gray-100 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-sm sm:rounded-2xl sm:border sm:border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
            <p className="text-[13px] font-semibold text-gray-900">Vista previa</p>
            <button type="button" onClick={() => setShowPreview(false)} className="text-[12px] text-gray-400 active:opacity-60">Cerrar</button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-300 px-4 py-4">
            <div className="mx-auto w-fit overflow-hidden rounded-xl bg-white shadow-sm">
              <RemitoPrint data={remitoData} empresa={empresa} vendedor={vendedor} telefono={telefono} alias={aliasMP} />
            </div>
          </div>
          <div className="border-t border-gray-200 bg-white px-4 py-2.5">
            <button type="button" onClick={handlePreviewPrint} disabled={!isOnline || isSaving || isPrintingBluetooth}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1565c0] text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-40">
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
              {isSaving ? "Imprimiendo..." : "Imprimir"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Confirmar nuevo remito */}
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
        <div id="printable-remito">
          <RemitoPrint data={remitoData} empresa={empresa} vendedor={vendedor} telefono={telefono} alias={aliasMP} />
        </div>
      </div>
    </>
  )
}