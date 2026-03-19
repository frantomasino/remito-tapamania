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

export default function PerfilPage() {
  const [email, setEmail] = useState("")
  const [userId, setUserId] = useState("")
  const [records, setRecords] = useState<SaleRecord[]>([])
  const today = useMemo(() => getTodayDateSafe(), [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "")
      setUserId(data.user?.id ?? "")
    })
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

  const downloadTodayCSV = useCallback(() => {
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
            <p className="text-sm text-muted-foreground">{today}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTodayCSV} disabled={todays.length === 0}>
              <Download className="h-4 w-4" />
              Descargar
            </Button>

            <Button variant="outline" size="sm" onClick={clearToday} disabled={todays.length === 0}>
              <Trash2 className="h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </div>

        <div className="mt-3 rounded-lg border bg-background px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Remitos:</span>
            <span className="font-semibold">{todays.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{formatCurrency(totalHoy)}</span>
          </div>
        </div>

        {todays.length === 0 ? (
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
                {todays.map((r) => (
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