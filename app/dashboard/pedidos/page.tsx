import Link from "next/link"
import { Download, Trash2, ClipboardList, PlusCircle } from "lucide-react"
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

export default async function PedidosPage() {
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

    revalidatePath("/dashboard/pedidos")
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
    <div className="px-4 pb-5 pt-4">
      <div className="space-y-5">
        <header>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ClipboardList className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Control del día
              </p>
              <h1 className="mt-1 text-xl font-semibold leading-none text-foreground">
                Pedidos
              </h1>
              <p className="mt-2 text-[13px] text-muted-foreground">{todayLabel}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Cantidad
              </p>
              <p className="mt-1 text-2xl font-semibold leading-none text-foreground tabular-nums">
                {records.length}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {records.length === 1 ? "remito cargado" : "remitos cargados"}
              </p>
            </div>

            <div className="rounded-2xl bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Total
              </p>
              <p className="mt-1 truncate text-xl font-semibold leading-none text-foreground tabular-nums">
                {formatCurrency(totalHoy)}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">Acumulado del día</p>
            </div>
          </div>

          <div className="mt-4">
            <Button asChild className="h-12 w-full rounded-2xl text-[14px] font-medium">
              <Link href="/dashboard/nuevo">
                <PlusCircle className="size-4" />
                Nuevo remito
              </Link>
            </Button>
          </div>
        </header>

        <section>
          <div className="mb-3">
            <h2 className="text-[15px] font-semibold text-foreground">Remitos de hoy</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Revisá rápido lo cargado y seguí con el recorrido.
            </p>
          </div>

          <SalesHistory title="Pedidos" records={records} />
        </section>

        <section className="pt-1">
          <div className="grid grid-cols-2 gap-2">
            <Button
              asChild
              variant="outline"
              disabled={records.length === 0}
              className="h-11 rounded-2xl text-[13px]"
            >
              <a href={records.length === 0 ? undefined : csvHref} download={filename}>
                <Download className="size-4" />
                Descargar
              </a>
            </Button>

            <form action={clearTodayAction} className="contents">
              <Button
                variant="outline"
                disabled={records.length === 0}
                className="h-11 rounded-2xl text-[13px]"
              >
                <Trash2 className="size-4" />
                Limpiar
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}