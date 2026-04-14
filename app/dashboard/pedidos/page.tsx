import Link from "next/link"
import { Plus } from "lucide-react"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { SalesHistory } from "@/components/sales-history"
import { PedidosDayActions } from "@/components/pedidos-day-actions"
import type { SaleRecord } from "@/lib/remito-types"
import { createClient } from "@/lib/supabase/server"

function getTodayDateSafe(): string {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const todayLabel = getTodayDateSafe()
  const todayISO = getTodayISODate()

  const { data, error } = await supabase
    .from("remitos")
    .select("id, numero_remito, fecha, cliente_nombre, total")
    .eq("user_id", user.id)
    .eq("fecha", todayISO)
    .order("created_at", { ascending: false })

  if (error) console.error("Error cargando pedidos del día", error)

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from("remitos")
      .delete()
      .eq("user_id", user.id)
      .eq("fecha", todayISO)
    if (error) { console.error("Error eliminando pedidos del día", error); return }
    revalidatePath("/dashboard/pedidos")
    revalidatePath("/dashboard/perfil")
  }

  const pedidosResumen = records.map((r) => ({
    numero: r.numero,
    cliente: r.cliente || "Sin cliente",
    total: r.total || 0,
  }))

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-3">
      <div className="flex flex-col gap-3">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              {todayLabel}
            </p>
            <h1 className="text-[18px] font-semibold leading-tight text-gray-900">
              Pedidos de hoy
            </h1>
          </div>
          <Link
            href="/dashboard/nuevo"
            className="flex h-8 items-center gap-1.5 rounded-xl bg-[#1565c0] px-3 text-[13px] font-semibold text-white active:opacity-80 shadow-sm"
          >
            <Plus className="size-3.5" />
            Nuevo
          </Link>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Pedidos</p>
            <p className="mt-0.5 text-[22px] font-semibold leading-none text-gray-900 tabular-nums">
              {records.length}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Total del día</p>
            <p className="mt-0.5 truncate text-[18px] font-semibold leading-none text-gray-900 tabular-nums">
              {formatCurrency(totalHoy)}
            </p>
          </div>
        </div>

        {/* ── LISTA ── */}
        <SalesHistory title="Pedidos" records={records} />

        {/* ── ACCIONES ── */}
        <PedidosDayActions
          fecha={todayLabel}
          totalDia={totalHoy}
          pedidos={pedidosResumen}
          disabledClear={records.length === 0}
          onClearAction={clearTodayAction}
        />

      </div>
    </div>
  )
}