"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Download, Trash2, LogOut, Mail, UserCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import type { SaleRecord } from "@/lib/remito-types"

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

export default function PerfilPage() {
  const [email, setEmail] = useState("")
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
        console.error("Error cargando remitos del día", error)
        setRecords([])
        return
      }

      const mapped: SaleRecord[] =
        (data as RemitoRow[] | null)?.map((row) => ({
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
      console.error("Error inesperado cargando remitos", error)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [todayISO, todayLabel])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "")

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

  const downloadTodayCSV = useCallback(() => {
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
        console.error("Error eliminando remitos del día", error)
        return
      }

      setRecords([])
    } catch (error) {
      console.error("Error inesperado eliminando remitos", error)
    }
  }, [userId, todayISO])

  return (
    <div className="px-4 pt-6 pb-6">
      <h1 className="text-2xl font-bold">Perfil</h1>

      <section className="mt-6 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCircle2 className="size-6" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold">Cuenta</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              <span className="truncate">{email || "Sin email"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Remitos de hoy</h2>
            <p className="text-sm text-muted-foreground">{todayLabel}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTodayCSV} disabled={loading || records.length === 0}>
              <Download className="h-4 w-4" />
              Descargar
            </Button>

            <Button variant="outline" size="sm" onClick={clearToday} disabled={loading || records.length === 0}>
              <Trash2 className="h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </div>

        <div className="mt-3 rounded-lg border bg-background px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Remitos:</span>
            <span className="font-semibold">{loading ? "..." : records.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{loading ? "..." : formatCurrency(totalHoy)}</span>
          </div>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Cargando remitos...</p>
        ) : records.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Todavía no hay remitos para mostrar.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Nro</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Cliente</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{r.numero}</td>
                    <td className="px-3 py-2 text-xs">{r.cliente || "Sin cliente"}</td>
                    <td className="px-3 py-2 text-right text-xs font-medium">{formatCurrency(r.total ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4">
        <h2 className="text-base font-semibold">Sesión</h2>
        <p className="mt-1 text-sm text-muted-foreground">Cerrá sesión desde acá cuando termines de usar la app.</p>

        <form action="/auth/signout" method="post" className="mt-4">
          <Button type="submit" variant="outline" className="h-12 w-full rounded-xl text-base font-semibold">
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </Button>
        </form>
      </section>
    </div>
  )
}