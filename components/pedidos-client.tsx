"use client"

import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import { Plus, ClipboardList, Loader2, Printer, Trash2, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react"
import { type SaleRecord, formatCurrency } from "@/lib/remito-types"
import { connectBlePrinter, disconnectBlePrinter, writeEscPos } from "@/lib/bluetooth-printer"
import { buildDailySummaryEscPos } from "@/lib/daily-summary-ticket-escpos"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type GroupBy = "dia" | "semana" | "mes" | "año"

const GROUP_LABELS: { id: GroupBy; label: string }[] = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "año", label: "Año" },
]

function getTodayISO() { return new Date().toISOString().slice(0, 10) }
function getTodayLabel() {
  return new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function getGroupKey(isoDate: string, groupBy: GroupBy): string {
  const d = new Date(`${isoDate}T00:00:00`)
  if (groupBy === "dia") return isoDate
  if (groupBy === "mes") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  if (groupBy === "año") return String(d.getFullYear())
  if (groupBy === "semana") {
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    return monday.toISOString().slice(0, 10)
  }
  return isoDate
}

function getGroupLabel(key: string, groupBy: GroupBy): string {
  if (groupBy === "dia") {
    const d = new Date(`${key}T00:00:00`)
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  }
  if (groupBy === "mes") {
    const [year, month] = key.split("-")
    const d = new Date(Number(year), Number(month) - 1, 1)
    return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
  }
  if (groupBy === "año") return key
  if (groupBy === "semana") {
    const d = new Date(`${key}T00:00:00`)
    const end = new Date(d)
    end.setDate(d.getDate() + 6)
    const from = d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
    const to = end.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
    return `${from} – ${to}`
  }
  return key
}

interface PedidosClientProps {
  records: SaleRecord[]
  userId: string
}

export function PedidosClient({ records, userId }: PedidosClientProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>("dia")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isPrinting, setIsPrinting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [clearTarget, setClearTarget] = useState<{ key: string; label: string; ids: string[] } | null>(null)
  const [toast, setToast] = useState<{ text: string; type: "ok" | "error" } | null>(null)
  const toastTimer = useRef<number | null>(null)
  const router = useRouter()

  const showToast = useCallback((text: string, type: "ok" | "error" = "ok") => {
    setToast({ text, type })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  const groups = useMemo(() => {
    const map = new Map<string, SaleRecord[]>()
    for (const r of records) {
      const key = getGroupKey(r.fecha, groupBy)
      const existing = map.get(key) ?? []
      existing.push(r)
      map.set(key, existing)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => ({
        key,
        label: getGroupLabel(key, groupBy),
        items,
        total: items.reduce((s, r) => s + (r.total || 0), 0),
      }))
  }, [records, groupBy])

  const statsPeriodo = useMemo(() => {
    const today = getTodayISO()
    const d = new Date()
    let desde = today
    if (groupBy === "semana") {
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const monday = new Date(d)
      monday.setDate(d.getDate() + diff)
      desde = monday.toISOString().slice(0, 10)
    } else if (groupBy === "mes") {
      desde = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
    } else if (groupBy === "año") {
      desde = `${d.getFullYear()}-01-01`
    }
    const filtered = groupBy === "dia"
      ? records.filter(r => r.fecha === today)
      : records.filter(r => r.fecha >= desde)
    return {
      count: filtered.length,
      total: filtered.reduce((s, r) => s + (r.total || 0), 0),
    }
  }, [records, groupBy])

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleGroupBy = useCallback((g: GroupBy) => {
    setGroupBy(g)
    setExpandedGroups(new Set())
  }, [])

  const handlePrintGroup = useCallback(async (group: { label: string; items: SaleRecord[]; total: number }) => {
    if (isPrinting) return
    try {
      setIsPrinting(true)
      const pedidos = group.items.map(r => ({ numero: r.numero, cliente: r.cliente, total: r.total, priceList: r.formaPago || "minorista", formaPagoCliente: r.formaPagoCliente || null }))
      const payload = buildDailySummaryEscPos({ fecha: group.label, cantidadPedidos: group.items.length, totalDia: group.total, pedidos })
      const { device, characteristic } = await connectBlePrinter()
      try { await writeEscPos(characteristic, payload) } finally { await disconnectBlePrinter(device) }
      showToast("Impreso correctamente")
    } catch (error) {
      const msg = error instanceof Error ? error.message : ""
      if (/bluetooth no disponible/i.test(msg)) showToast("BT no disponible en este dispositivo", "error")
      else if (/no se pudo abrir/i.test(msg)) showToast("¿La impresora está encendida?", "error")
      else showToast("No se pudo conectar con la impresora", "error")
    } finally { setIsPrinting(false) }
  }, [isPrinting, showToast])

  const handleClear = useCallback(async () => {
    if (!clearTarget || isClearing) return
    try {
      setIsClearing(true)
      setShowConfirmClear(false)
      const supabase = createClient()
      const { error } = await supabase.from("remitos").delete().in("id", clearTarget.ids).eq("user_id", userId)
      if (error) { showToast("Error al eliminar los pedidos", "error"); return }
      showToast(`${clearTarget.ids.length} pedidos eliminados`)
      router.refresh()
    } catch {
      showToast("Error inesperado al eliminar", "error")
    } finally {
      setIsClearing(false)
      setClearTarget(null)
    }
  }, [clearTarget, isClearing, userId, router, showToast])

  const openClearConfirm = useCallback((group: { key: string; label: string; items: SaleRecord[] }) => {
    setClearTarget({ key: group.key, label: group.label, ids: group.items.map(r => r.id) })
    setShowConfirmClear(true)
  }, [])

  return (
    <>
      {/* ── MODAL CONFIRMAR LIMPIAR ── */}
      <Dialog open={showConfirmClear} onOpenChange={setShowConfirmClear}>
        <DialogContent className="max-w-sm rounded-2xl border-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-semibold text-gray-900">Eliminar pedidos</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-gray-500">
            Se eliminan <span className="font-semibold text-gray-900">{clearTarget?.ids.length ?? 0}</span> {(clearTarget?.ids.length ?? 0) === 1 ? "pedido" : "pedidos"} de <span className="font-semibold text-gray-900">{clearTarget?.label}</span>. No se puede deshacer.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setShowConfirmClear(false)}
              className="flex h-10 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white text-[13px] font-medium text-gray-700 active:opacity-60">
              Cancelar
            </button>
            <button type="button" onClick={handleClear}
              className="flex h-10 flex-1 items-center justify-center rounded-xl bg-red-500 text-[13px] font-semibold text-white active:opacity-80">
              {isClearing ? <Loader2 className="size-3.5 animate-spin" /> : "Eliminar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── TOAST ── */}
      <div className={cn(
        "fixed bottom-24 left-1/2 z-[60] w-[calc(100%-32px)] max-w-sm -translate-x-1/2 transition-all duration-200",
        toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}>
        <div className={cn(
          "flex items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-lg bg-white",
          toast?.type === "error" ? "border-red-200" : "border-gray-200"
        )}>
          <div className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-white",
            toast?.type === "error" ? "bg-red-500" : "bg-[#1565c0]"
          )}>
            {toast?.type === "error"
              ? <AlertCircle className="size-3.5" />
              : <CheckCircle2 className="size-3" />
            }
          </div>
          <p className="text-[13px] font-medium text-gray-800">{toast?.text}</p>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pb-6 pt-3">
        <div className="flex flex-col gap-3">

          {/* ── HEADER ── */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{getTodayLabel()}</p>
              <h1 className="text-[18px] font-semibold leading-tight text-gray-900">Pedidos</h1>
            </div>
            <Link href="/dashboard/nuevo"
              className="flex h-8 items-center gap-1.5 rounded-xl bg-[#1565c0] px-3 text-[13px] font-semibold text-white active:opacity-80 shadow-sm">
              <Plus className="size-3.5" />Nuevo
            </Link>
          </div>

          {/* ── AGRUPAR POR ── */}
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-2">Agrupar por</p>
            <div className="flex gap-1.5">
              {GROUP_LABELS.map((g) => (
                <button key={g.id} type="button" onClick={() => handleGroupBy(g.id)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-[12px] font-medium transition-colors border",
                    groupBy === g.id
                      ? "bg-[#1565c0] text-white border-[#1565c0]"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  )}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── STATS ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Pedidos</p>
              <p className="mt-0.5 text-[22px] font-semibold leading-none text-gray-900 tabular-nums">{statsPeriodo.count}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Total</p>
              <p className="mt-0.5 truncate text-[18px] font-semibold leading-none text-gray-900 tabular-nums">
                {formatCurrency(statsPeriodo.total)}
              </p>
            </div>
          </div>

          {/* ── GRUPOS ── */}
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-8 text-center shadow-sm">
              <ClipboardList className="size-5 text-gray-300" />
              <p className="text-[13px] text-gray-400">Sin pedidos</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.key)
                return (
                  <div key={group.key} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <button type="button" onClick={() => toggleGroup(group.key)}
                      className="flex w-full items-center gap-2 px-3 py-3 text-left active:opacity-70 bg-white">
                      <ChevronRight className={cn(
                        "size-4 shrink-0 text-gray-400 transition-transform duration-150",
                        isExpanded && "rotate-90"
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-900">
                          {group.label}
                          <span className="ml-1.5 text-[12px] font-normal text-gray-400">({group.items.length})</span>
                        </p>
                        <p className="text-[12px] text-gray-500 tabular-nums">{formatCurrency(group.total)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handlePrintGroup(group)} disabled={isPrinting}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 active:opacity-60 disabled:opacity-40">
                          {isPrinting ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
                        </button>
                        <button type="button" onClick={() => openClearConfirm(group)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-400 active:opacity-60">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 divide-y divide-gray-100">
                        {group.items.map((record) => (
                          <Link key={record.id} href={`/dashboard/${record.id}`}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 active:bg-gray-50">
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-gray-900 truncate">
                                {record.cliente || "Sin cliente"}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[11px] text-gray-400 tabular-nums">{record.numero}</p>
                                {record.formaPagoCliente && (
                                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                    record.formaPagoCliente === "efectivo"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}>
                                    {record.formaPagoCliente === "efectivo" ? "Efectivo" : "MP"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[13px] font-semibold text-gray-900 tabular-nums shrink-0">
                              {formatCurrency(record.total ?? 0)}
                            </p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </>
  )
}