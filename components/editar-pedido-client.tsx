"use client"

import { useState, useRef, useCallback, useEffect, useMemo, startTransition, useLayoutEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bluetooth, Loader2, CheckCircle2, WifiOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ProductSelector } from "@/components/product-selector"
import { connectBlePrinter, disconnectBlePrinter, writeEscPos } from "@/lib/bluetooth-printer"
import { buildRemitoEscPos } from "@/lib/remito-ticket-escpos"
import { cn } from "@/lib/utils"
import {
  type Product, type LineItem,
  formatCurrency, parseCSV,
} from "@/lib/remito-types"

type ProductsCacheEntry = { loadedAt: number; products: Product[] }

interface EditarPedidoClientProps {
  remitoId: string
  numeroRemito: string
  fechaRemito: string
  clienteNombre: string | null
  priceListUuid: string
  initialItems: LineItem[]
  empresa: string
  vendedor: string
  telefono: string
  alias: string
}

export function EditarPedidoClient({
  remitoId, numeroRemito, fechaRemito, clienteNombre,
  priceListUuid, initialItems, empresa, vendedor, telefono, alias,
}: EditarPedidoClientProps) {
  const router = useRouter()
  const [items, setItems] = useState<LineItem[]>(initialItems)
  const [clienteNombreState, setClienteNombreState] = useState(clienteNombre ?? "")
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastText, setToastText] = useState("")

  const toastTimer = useRef<number | null>(null)
  const itemsRef = useRef(items)
  const productsRef = useRef(products)
  useLayoutEffect(() => { itemsRef.current = items }, [items])
  useLayoutEffect(() => { productsRef.current = products }, [products])

  const cacheRef = useRef<ProductsCacheEntry>({ loadedAt: 0, products: [] })
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const sync = () => setIsOnline(navigator.onLine)
    sync()
    window.addEventListener("online", sync)
    window.addEventListener("offline", sync)
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync) }
  }, [])

  const showToast = useCallback((text: string) => {
    setToastText(text)
    setToastVisible(true)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 2000)
  }, [])

  useEffect(() => {
    if (!priceListUuid) return
    const controller = new AbortController()
    const CACHE_TTL_MS = 30 * 60 * 1000
    const load = async () => {
      const cached = cacheRef.current
      const isStale = !cached.loadedAt || (Date.now() - cached.loadedAt) > CACHE_TTL_MS
      if (cached?.products?.length > 0 && !isStale) { setProducts(cached.products); return }
      try {
        setIsLoadingProducts(true)
        const res = await fetch(`/api/products-csv?listId=${priceListUuid}`, { cache: "no-store", signal: controller.signal })
        if (!res.ok) throw new Error()
        const parsed = parseCSV(await res.text())
        cacheRef.current = { loadedAt: Date.now(), products: parsed }
        startTransition(() => setProducts(parsed))
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return
      } finally { setIsLoadingProducts(false) }
    }
    load()
    return () => controller.abort()
  }, [priceListUuid])

  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])
  const totalUnits = useMemo(() => items.reduce((s, i) => s + i.cantidad, 0), [items])

  const handleItemsChange = useCallback((updater: React.SetStateAction<LineItem[]>) => {
    setItems((prev) => typeof updater === "function" ? updater(prev) : updater)
  }, [])

  const handleGuardarYReimprimir = useCallback(async () => {
    if (!isOnline || isSaving || isPrinting) return
    const currentItems = itemsRef.current.filter(i => i.cantidad > 0)
    if (currentItems.length === 0) { showToast("No hay productos"); return }

    try {
      setIsSaving(true)
      showToast("Guardando...")

      const newTotal = currentItems.reduce((s, i) => s + i.subtotal, 0)

      const { error: remitoError } = await supabase
        .from("remitos")
        .update({ cliente_nombre: clienteNombreState.trim() || null, total: newTotal })
        .eq("id", remitoId)
      if (remitoError) { showToast("Error al guardar"); return }

      const { error: deleteError } = await supabase
        .from("remito_items")
        .delete()
        .eq("remito_id", remitoId)
      if (deleteError) { showToast("Error al guardar items"); return }

      const { error: insertError } = await supabase
        .from("remito_items")
        .insert(currentItems.map(item => ({
          remito_id: remitoId,
          descripcion: item.product.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.product.precio,
          subtotal: item.subtotal,
          opcion: item.opcion || null,
        })))
      if (insertError) { showToast("Error al guardar items"); return }

      setIsSaving(false)
      setIsPrinting(true)
      showToast("Conectando impresora...")

      const currentProducts = productsRef.current
      const itemsOrdenados = currentProducts.length > 0
        ? [...currentItems].sort((a, b) => {
            const idxA = currentProducts.findIndex(p => p.descripcion === a.product.descripcion)
            const idxB = currentProducts.findIndex(p => p.descripcion === b.product.descripcion)
            return idxA - idxB
          })
        : currentItems

      const remitoData = {
        numero: numeroRemito,
        fecha: fechaRemito,
        client: { nombre: clienteNombreState.trim(), direccion: "", telefono: "", mail: "", formaPago: "" },
        items: itemsOrdenados,
        subtotal: newTotal,
        total: newTotal,
      }

      const payload = buildRemitoEscPos(remitoData, empresa, vendedor, telefono, alias)
      const { device, characteristic } = await connectBlePrinter()
      showToast("Conectado. Enviando...")
      try { await writeEscPos(characteristic, payload) } finally { await disconnectBlePrinter(device) }

      showToast("¡Impreso!")
      setTimeout(() => router.push(`/dashboard/${remitoId}`), 1500)

    } catch (error) {
      const msg = error instanceof Error ? error.message : ""
      if (/bluetooth no disponible/i.test(msg)) showToast("BT no disponible")
      else if (/no se pudo abrir/i.test(msg)) showToast("¿Impresora encendida?")
      else showToast("Error al imprimir")
    } finally {
      setIsSaving(false)
      setIsPrinting(false)
    }
  }, [isOnline, isSaving, isPrinting, clienteNombreState, remitoId, numeroRemito, fechaRemito, empresa, vendedor, telefono, alias, supabase, router, showToast])

  const isLoading = isSaving || isPrinting
  const hasItems = items.filter(i => i.cantidad > 0).length > 0

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-2.5">
          <button type="button" onClick={() => router.back()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 active:opacity-60">
            <ArrowLeft className="size-3.5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-gray-400">{numeroRemito} · {fechaRemito}</p>
            <p className="text-[13px] font-semibold text-gray-900">Editar pedido</p>
          </div>
        </div>
        {!isOnline && (
          <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-4 py-2">
            <WifiOff className="size-3.5 text-red-500" />
            <p className="text-[12px] font-semibold text-red-600">Sin internet</p>
          </div>
        )}
      </header>

      {/* Padding bottom: nav (64px) + barra acción (72px) + extra */}
      <main className="mx-auto w-full max-w-md px-4 pt-3"
        style={{ paddingBottom: `calc(${hasItems ? 136 : 72}px + env(safe-area-inset-bottom) + 24px)` }}>
        <div className="mb-3">
          <input type="text" placeholder="Nombre del cliente (opcional)"
            value={clienteNombreState}
            onChange={(e) => setClienteNombreState(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#1565c0] shadow-sm" />
        </div>

        {isLoadingProducts && products.length === 0 ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />)}
          </div>
        ) : (
          <ProductSelector products={products} items={items} onItemsChange={handleItemsChange} />
        )}
      </main>

      {/* Barra de acción — encima de la nav del layout (bottom-16 = 64px) */}
      {hasItems && (
        <div className="fixed inset-x-0 z-50 border-t border-gray-200 bg-white px-4 pt-3 shadow-lg"
          style={{ bottom: `calc(64px + env(safe-area-inset-bottom))` }}>
          <div className="mx-auto max-w-md flex items-center gap-3 pb-3">
            <div className="flex-1">
              <p className="text-[15px] font-bold text-gray-900 tabular-nums">{formatCurrency(total)}</p>
              <p className="text-[11px] text-gray-400">{totalUnits} unidades</p>
            </div>
            <button type="button" onClick={handleGuardarYReimprimir} disabled={isLoading || !isOnline}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#1565c0] px-5 text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-40 shadow-sm">
              {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Bluetooth className="size-3.5" />}
              {isLoading ? "Guardando..." : "Guardar e imprimir"}
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={cn(
        "fixed left-1/2 z-[60] w-[calc(100%-32px)] max-w-sm -translate-x-1/2 transition-all duration-200",
        toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
        style={{ bottom: `calc(140px + env(safe-area-inset-bottom))` }}>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-lg">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1565c0] text-white">
            <CheckCircle2 className="size-3" />
          </div>
          <p className="text-[13px] font-medium text-gray-800">{toastText}</p>
        </div>
      </div>
    </div>
  )
}