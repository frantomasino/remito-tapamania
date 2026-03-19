import { Download, Trash2, LogOut, Mail, UserCircle2 } from "lucide-react"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
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

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const todayLabel = getTodayDateSafe()
  const todayISO = getTodayISODate()

  const { data, error } = await supabase
    .from("remitos")
    .select("id, numero_remito, fecha, cliente_nombre, total")
    .eq("user_id", user.id)
    .eq("fecha", todayISO)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error cargando remitos del día", error)
  }

  const records: SaleRecord[] =
    (data as RemitoRow[] | null)?.map((row) => ({
      id: row.id,
      numero: row.numero_remito,
      fecha: todayLabel,
      cliente: row.cliente_nombre || "Sin cliente",
      formaPago: "",
      total: Number(row.total || 0),
      itemCount: 0,
    })) ?? []

  const totalHoy = records.reduce((s, r) => s + (r.total || 0), 0)

  async function clearTodayAction() {
    "use server"

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase
      .from("remitos")
      .delete()
      .eq("user_id", user.id)
      .eq("fecha", todayISO)

    if (error) {
      console.error("Error eliminando remitos del día", error)
      return
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/perfil")
  }

  const csvHeader = ["Nro Remito", "Fecha", "Cliente", "Total"]
  const csvRows = records.map((r) => [
    `"${String(r.numero ?? "").replace(/"/g, '""')}"`,
    `"${String(r.fecha ?? "").replace(/"/g, '""')}"`,
    `"${String(r.cliente ?? "Sin cliente").replace(/"/g, '""')}"`,
    String(r.total ?? 0),
  ])
  csvRows.push(["", "", `"TOTAL DEL DÍA"`, String(totalHoy)])
  const csvContent = [csvHeader.join(","), ...csvRows.map((row) => row.join(","))].join("\n")
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
  const safeDate = todayLabel.replaceAll("/", "-")
  const filename = `remitos-${safeDate}.csv`

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
              <span className="truncate">{user.email || "Sin email"}</span>
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
            <Button asChild variant="outline" size="sm" disabled={records.length === 0}>
              <a href={records.length === 0 ? undefined : csvHref} download={filename}>
                <Download className="h-4 w-4" />
                Descargar
              </a>
            </Button>

            <form action={clearTodayAction}>
              <Button variant="outline" size="sm" disabled={records.length === 0}>
                <Trash2 className="h-4 w-4" />
                Limpiar
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-3 rounded-lg border bg-background px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Remitos:</span>
            <span className="font-semibold">{records.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{formatCurrency(totalHoy)}</span>
          </div>
        </div>

        {records.length === 0 ? (
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