"use client"

import { useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { Plus, ClipboardList, Loader2, Printer, Trash2 } from "lucide-react"
import { type SaleRecord, formatCurrency } from "@/lib/remito-types"
import { connectBlePrinter, disconnectBlePrinter, writeEscPos } from "@/lib/bluetooth-printer"
import { buildDailySummaryEscPos } from "@/lib/daily-summary-ticket-escpos"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Filter = "hoy" | "semana" | "mes" | "año" | "todo"

const FILTER_LABELS: { id: Filter; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "año", label: "Año" },
  { id: "todo", label: "Todo" },
]

function getTodayISO() { return new Date().toISOString().slice(0, 10) }
function getTodayLabel() {
  return new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function getMondayISO() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getFirstDayOfMonthISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function getFirstDayOfYearISO() {
  return `${new Date().getFullYear()}-01-01`
}

function formatDateLabel(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

interface PedidosClientProps {
  records: SaleRecord[]
  userId: string
}

export function PedidosClient({ records, userId }: PedidosClientProps) {
  const [filter, setFilter] = useState<Filter>("hoy")
  const [isPrinting, setIsPrinting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const router = useRouter()

  const filtered = useMemo(() => {
    if (filter === "todo") return records
    const today = getTodayISO()
    const monday = getMondayISO()
    const firstMonth = getFirstDayOfMonthISO()
    const firstYear = getFirstDayOfYearISO()
    return records.filter((r) => {
      if (filter === "hoy") return r.fecha === today
      if (filter === "semana") return r.fecha >= monday
      if (filter === "mes") return r.fecha >= firstMonth
      if (filter === "año") return r.fecha >= firstYear
      return true
    })
  }, [records, filter])

  const totalFiltrado = useMemo(() => filtered.reduce((s, r) => s + (r.total || 0), 0), [filtered])

  // Agrupar por fecha para mostrar separadores
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, SaleRecord[]>()
    for (const r of filtered) {
      const existing = groups.get(r.fecha) ?? []
      existing.push(r)
      groups.set(r.fecha, existing)
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const handlePrintDay = useCallback(async () => {
    if (isPrinting || filtered.length === 0) return
    try {
      setIsPrinting(true)
      const pedidos = filtered.map(r => ({ numero: r.numero, cliente: r.cliente, total: r.total }))
      const payload = buildDailySummaryEscPos({
        fecha: getTodayLabel(),
        cantidadPedidos: filtered.length,
        totalDia: totalFiltrado,
        pedidos,
      })
      const { device, characteristic } = await connectBlePrinter()
      try { await writeEscPos(characteristic, payload) } finally { await disconnectBlePrinter(device) }
    } catch (error) {
      console.error("Error imprimiendo", error)
      alert(error instanceof Error ? error.message : "No se pudo imprimir")
    } finally { setIsPrinting(false) }
  }, [isPrinting, filtered, totalFiltrado])

  const handleClearToday = useCallback(async () => {
    const todayRecords = records.filter(r => r.fecha === getTodayISO())
    if (isClearing || todayRecords.length === 0) return
    if (!confirm(`¿Eliminar ${todayRecords.length} pedidos de hoy?`)) return
    try {
      setIsClearing(true)
      const supabase = createClient()
      const ids = todayRecords.map(r => r.id)
      await supabase.from("remitos").delete().in("id", ids).eq("user_id", userId)
      router.refresh()
    } catch (error) {
      console.error("Error eliminando pedidos", error)
    } finally { setIsClearing(false) }
  }, [isClearing, records, userId, router])

  const todayCount = useMemo(() => records.filter(r => r.fecha === getTodayISO()).length, [records])

  return (
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

        {/* ── FILTROS ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTER_LABELS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors border ${
                filter === f.id
                  ? "bg-[#1565c0] text-white border-[#1565c0]"
                  : "bg-white text-gray-600 border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Pedidos</p>
            <p className="mt-0.5 text-[22px] font-semibold leading-none text-gray-900 tabular-nums">{filtered.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Total</p>
            <p className="mt-0.5 truncate text-[18px] font-semibold leading-none text-gray-900 tabular-nums">
              {formatCurrency(totalFiltrado)}
            </p>
          </div>
        </div>

        {/* ── LISTA ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-8 text-center shadow-sm">
            <ClipboardList className="size-5 text-gray-300" />
            <p className="text-[13px] text-gray-400">Sin pedidos en este período</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Historial</p>
              <p className="text-[11px] text-gray-400">{filtered.length} pedidos</p>
            </div>
            <div className="divide-y divide-gray-100">
              {groupedByDate.map(([fecha, pedidos]) => (
                <div key={fecha}>
                  {/* Separador de fecha — solo cuando no es filtro "hoy" */}
                  {filter !== "hoy" && (
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                      <p className="text-[11px] font-medium text-gray-400">{formatDateLabel(fecha)}</p>
                    </div>
                  )}
                  {pedidos.map((record) => (
                    <Link key={record.id} href={`/dashboard/${record.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 active:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">
                          {record.cliente || "Sin cliente"}
                        </p>
                        <p className="text-[11px] text-gray-400 tabular-nums">{record.numero}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-gray-900 tabular-nums shrink-0">
                        {formatCurrency(record.total ?? 0)}
                      </p>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACCIONES ── */}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handlePrintDay} disabled={filtered.length === 0 || isPrinting}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-[13px] font-medium text-gray-600 shadow-sm active:opacity-60 disabled:opacity-40">
            {isPrinting ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
            {isPrinting ? "Imprimiendo..." : "Imprimir"}
          </button>
          <button type="button" onClick={handleClearToday} disabled={todayCount === 0 || isClearing}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white text-[13px] font-medium text-red-500 shadow-sm active:opacity-60 disabled:opacity-40">
            {isClearing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            {isClearing ? "Limpiando..." : "Limpiar hoy"}
          </button>
        </div>

      </div>
    </div>
  )
}