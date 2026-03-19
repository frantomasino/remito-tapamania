import { Download, Trash2, ClipboardList } from "lucide-react"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SalesHistory } from "@/components/sales-history"
import type { SaleRecord } from "@/lib/remito-types"
import { createClient } from "@/lib/supabase/server"

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

export default async function DashboardPage() {
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
    console.error("Error cargando pedidos del día", error)
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
      console.error("Error eliminando pedidos del día", error)
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
          <span className="font-semibold">{records.length}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-semibold">{formatCurrency(totalHoy)}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm" disabled={records.length === 0}>
            <a href={records.length === 0 ? undefined : csvHref} download={filename}>
              <Download className="size-4" />
              Descargar
            </a>
          </Button>

          <form action={clearTodayAction}>
            <Button variant="outline" size="sm" disabled={records.length === 0}>
              <Trash2 className="size-4" />
              Limpiar
            </Button>
          </form>
        </div>
      </section>

      <div className="mt-4">
        <SalesHistory title="Pedidos" records={records} />
      </div>
    </div>
  )
}