import Link from "next/link"
import { ClipboardList, PlusCircle } from "lucide-react"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SalesHistory } from "@/components/sales-history"
import { PedidosDayActions } from "@/components/pedidos-day-actions"
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

  const pedidosResumen = records.map((r) => ({
    numero: r.numero,
    cliente: r.cliente || "Sin cliente",
    total: r.total || 0,
  }))

  return (
    <div className="px-4 pb-5 pt-4 text-white">
      <div className="space-y-5">
        <header className="space-y-3">
          <div className="rounded-[28px] border border-white/10 bg-[#2a2926] px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#1976d2] text-white">
                <ClipboardList className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b0b0b6]">
                  Pedidos
                </p>
                <h1 className="mt-1 text-[22px] font-semibold leading-none text-white">
                  Pedidos de hoy
                </h1>
                <p className="mt-2 text-sm text-[#9e9ea6]">{todayLabel}</p>
              </div>
            </div>
          </div>

          <Button
            asChild
            size="lg"
            className="h-12 w-full rounded-2xl bg-[#1976d2] text-white hover:bg-[#1c82e4]"
          >
            <Link href="/dashboard/nuevo">
              <PlusCircle className="size-4" />
              Nuevo pedido
            </Link>
          </Button>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#a9a9ae]">
              Cantidad
            </p>
            <p className="mt-2 text-[26px] font-semibold leading-none text-white tabular-nums">
              {records.length}
            </p>
            <p className="mt-2 text-sm text-[#9e9ea6]">
              {records.length === 1 ? "pedido cargado" : "pedidos cargados"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#a9a9ae]">
              Total del día
            </p>
            <p className="mt-2 truncate text-[22px] font-semibold leading-none text-white tabular-nums">
              {formatCurrency(totalHoy)}
            </p>
            <p className="mt-2 text-sm text-[#9e9ea6]">Acumulado</p>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[#d6d6da]">
              Cargados hoy
            </h2>
            <p className="mt-1 text-sm text-[#9e9ea6]">
              Revisá rápido los pedidos del día y seguí con el recorrido.
            </p>
          </div>

          <SalesHistory title="Pedidos" records={records} />
        </section>

        <section className="pt-1">
          <PedidosDayActions
            fecha={todayLabel}
            totalDia={totalHoy}
            pedidos={pedidosResumen}
            disabledClear={records.length === 0}
            onClearAction={clearTodayAction}
          />
        </section>
      </div>
    </div>
  )
}