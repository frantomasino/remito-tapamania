"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Download } from "lucide-react"
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

  const downloadTodaySalesCSV = useCallback(() => {
    const escapeCSV = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const header = ["Nro Remito", "Fecha", "Cliente", "Total"]

    const rows = todays.map((r) => [escapeCSV(r.numero), escapeCSV(r.fecha), escapeCSV(r.cliente || ""), String(r.total)])

    const totalHoy = todays.reduce((s, r) => s + r.total, 0)
    rows.push(["", "", escapeCSV("TOTAL DEL DÍA"), String(totalHoy)])

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

    const safeDate = today.replaceAll("/", "-")
    const filename = `ventas-${safeDate}.csv`

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [todays, today])

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Remitos del día</h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>

        <Button variant="outline" size="sm" onClick={downloadTodaySalesCSV} disabled={todays.length === 0}>
          <Download className="size-4" />
          Descargar hoy
        </Button>
      </div>

      <div className="mt-4">
        <SalesHistory
          title="Remitos"
          records={todays}
          onClear={() => {
            if (!userId) return
            try {
              localStorage.removeItem(k(LS_BASE_KEYS.salesHistory, userId))
            } catch {}
            setRecords([])
          }}
        />
      </div>
    </div>
  )
}