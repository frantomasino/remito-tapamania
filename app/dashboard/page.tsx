"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Download, Trash2, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SalesHistory } from "@/components/sales-history"
import type { SaleRecord } from "@/lib/remito-types"
import { createClient } from "@/lib/supabase/client"

function getTodayDateSafe(): string {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const LS_BASE_KEYS = {
  salesHistory: "salesHistory",
  lastDay: "lastDay",
} as const

function k(base: string, userId: string) {
  return `${base}:${userId}`
}

function formatCurrency(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

export default function DashboardPage() {
  const [userId, setUserId] = useState("")
  const [records, setRecords] = useState<SaleRecord[]>([])
  const today = useMemo(() => getTodayDateSafe(), [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""))
  }, [])

  useEffect(() => {
    if (!userId) return

    try {
      const salesKey = k(LS_BASE_KEYS.salesHistory, userId)
      const lastDayKey = k(LS_BASE_KEYS.lastDay, userId)

      const lastDay = localStorage.getItem(lastDayKey)
      if (lastDay && lastDay !== today) {
        localStorage.removeItem(salesKey)
      }

      localStorage.setItem(lastDayKey, today)

      const raw = localStorage.getItem(salesKey)
      const parsed = raw ? (JSON.parse(raw) as SaleRecord[]) : []
      setRecords(Array.isArray(parsed) ? parsed : [])
    } catch {
      setRecords([])
    }
  }, [userId, today])

  const todays = useMemo(() => records.filter((r) => r.fecha === today), [records, today])
  const totalHoy = useMemo(() => todays.reduce((s, r) => s + (r.total || 0), 0), [todays])

  const downloadTodaySalesCSV = useCallback(() => {
    const escapeCSV = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const header = ["Nro Remito", "Fecha", "Cliente", "Total"]

    const rows = todays.map((r) => [
      escapeCSV(r.numero),
      escapeCSV(r.fecha),
      escapeCSV(r.cliente || "Sin cliente"),
      String(r.total ?? 0),
    ])

    rows.push(["", "", escapeCSV("TOTAL DEL DÍA"), String(totalHoy)])

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

    const safeDate = today.replaceAll("/", "-")
    const filename = `remitos-${safeDate}.csv`

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [todays, totalHoy, today])

  const clearToday = useCallback(() => {
    if (!userId) return
    try {
      localStorage.removeItem(k(LS_BASE_KEYS.salesHistory, userId))
    } catch {}
    setRecords([])
  }, [userId])

  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardList className="size-6" />
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Pedidos del día</h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Cantidad</span>
          <span className="font-semibold">{todays.length}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-semibold">{formatCurrency(totalHoy)}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTodaySalesCSV} disabled={todays.length === 0}>
            <Download className="size-4" />
            Descargar
          </Button>

          <Button variant="outline" size="sm" onClick={clearToday} disabled={todays.length === 0}>
            <Trash2 className="size-4" />
            Limpiar
          </Button>
        </div>
      </section>

      <div className="mt-4">
        <SalesHistory title="Pedidos" records={todays} onClear={clearToday} />
      </div>
    </div>
  )
}