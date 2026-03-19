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
    <div className="px-3 pb-5 pt-4">
      <header className="rounded-2xl border bg-card px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserCircle2 className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Cuenta
            </p>
            <h1 className="mt-0.5 text-lg font-semibold text-foreground">Perfil</h1>

            <div className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              <span className="truncate">{user.email || "Sin email"}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-3 rounded-2xl border bg-card px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Resumen diario
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-foreground">Remitos de hoy</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">{todayLabel}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border bg-background px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cantidad</p>
            <p className="mt-1 text-base font-semibold text-foreground">{records.length}</p>
          </div>

          <div className="rounded-xl border bg-background px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="mt-1 truncate text-base font-semibold text-foreground">{formatCurrency(totalHoy)}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild variant="outline" disabled={records.length === 0} className="h-10 rounded-xl">
            <a href={records.length === 0 ? undefined : csvHref} download={filename}>
              <Download className="size-4" />
              Descargar
            </a>
          </Button>

          <form action={clearTodayAction} className="contents">
            <Button variant="outline" disabled={records.length === 0} className="h-10 rounded-xl">
              <Trash2 className="size-4" />
              Limpiar
            </Button>
          </form>
        </div>

        {records.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed bg-background px-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">Todavía no hay remitos para mostrar.</p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {records.map((r) => (
              <article key={r.id} className="rounded-xl border bg-background px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[12px] font-medium text-foreground">{r.numero}</p>
                    <p className="mt-1 truncate text-[12px] text-muted-foreground">
                      {r.cliente || "Sin cliente"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-foreground">
                      {formatCurrency(r.total ?? 0)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{r.fecha}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-3 rounded-2xl border bg-card px-4 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Sesión
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-foreground">Cerrar sesión</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Salí de la cuenta cuando termines de usar la app.
          </p>
        </div>

        <form action="/auth/signout" method="post" className="mt-3">
          <Button type="submit" variant="outline" className="h-10 w-full rounded-xl">
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </form>
      </section>
    </div>
  )
}