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

function getTodayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatCurrency(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

type RemitoRow = {
  id: string
  numero_remito: string
  fecha: string
  cliente_nombre: string | null
  total: number
}

export default function DashboardPage() {
  const [userId, setUserId] = useState("")
  const [records, setRecords] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)

  const todayLabel = useMemo(() => getTodayDateSafe(), [])
  const todayISO = useMemo(() => getTodayISODate(), [])

  const loadTodaysRemitos = useCallback(async (uid: string) => {
    try {
      setLoading(true)

      const supabase = createClient()

      const { data, error } = await supabase
        .from("remitos")
        .select("id, numero_remito, fecha, cliente_nombre, total")
        .eq("user_id", uid)
        .eq("fecha", todayISO)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error cargando pedidos del día", error)
        setRecords([])
        return
      }

      const mapped: SaleRecord[] = (data as RemitoRow[] | null)?.map((row) => ({
        id: row.id,
        numero: row.numero_remito,
        fecha: todayLabel,
        cliente: row.cliente_nombre || "Sin cliente",
        formaPago: "",
        total: Number(row.total || 0),
        itemCount: 0,
      })) ?? []

      setRecords(mapped)
    } catch (error) {
      console.error("Error inesperado cargando pedidos", error)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [todayISO, todayLabel])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? ""
      setUserId(uid)

      if (uid) {
        loadTodaysRemitos(uid)
      } else {
        setLoading(false)
      }
    })
  }, [loadTodaysRemitos])

  const totalHoy = useMemo(() => records.reduce((s, r) => s + (r.total || 0), 0), [records])

  const downloadTodaySalesCSV = useCallback(() => {
    const escapeCSV = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const header = ["Nro Remito", "Fecha", "Cliente", "Total"]

    const rows = records.map((r) => [
      escapeCSV(r.numero),
      escapeCSV(r.fecha),
      escapeCSV(r.cliente || "Sin cliente"),
      String(r.total ?? 0),
    ])

    rows.push(["", "", escapeCSV("TOTAL DEL DÍA"), String(totalHoy)])

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

    const safeDate = todayLabel.replaceAll("/", "-")
    const filename = `remitos-${safeDate}.csv`

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [records, totalHoy, todayLabel])

  const clearToday = useCallback(async () => {
    if (!userId) return

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("remitos")
        .delete()
        .eq("user_id", userId)
        .eq("fecha", todayISO)

      if (error) {
        console.error("Error eliminando pedidos del día", error)
        return
      }

      setRecords([])
    } catch (error) {
      console.error("Error inesperado eliminando pedidos", error)
    }
  }, [userId, todayISO])

  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardList className="size-6" />
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Pedidos del día</h1>
          <p className="mt-1 text-sm text-muted-foreground">{todayLabel}</p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Cantidad</span>
          <span className="font-semibold">{loading ? "..." : records.length}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-semibold">{loading ? "..." : formatCurrency(totalHoy)}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTodaySalesCSV} disabled={loading || records.length === 0}>
            <Download className="size-4" />
            Descargar
          </Button>

          <Button variant="outline" size="sm" onClick={clearToday} disabled={loading || records.length === 0}>
            <Trash2 className="size-4" />
            Limpiar
          </Button>
        </div>
      </section>

      <div className="mt-4">
        <SalesHistory title="Pedidos" records={records} onClear={clearToday} />
      </div>
    </div>
  )
}