import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import type { RemitoWithItems } from "@/lib/remito-types"

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatCurrency(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

const estadoLabel: Record<string, string> = {
  pendiente: "Pendiente",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

const estadoColor: Record<string, string> = {
  pendiente: "bg-amber-500/10 text-amber-300",
  entregado: "bg-emerald-500/10 text-emerald-300",
  cancelado: "bg-red-500/10 text-red-300",
}

export default async function RemitoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data, error } = await supabase
    .from("remitos")
    .select("*, remito_items(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) notFound()

  const remito = data as RemitoWithItems
  const total = Number(remito.total || 0)
  const itemCount = remito.remito_items.length

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-3 text-white">
      <div className="flex flex-col gap-3">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/pedidos"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#1a1a1c] text-[#666] active:opacity-60"
              aria-label="Volver"
            >
              <ArrowLeft className="size-3.5" />
            </Link>
            <div>
              <h1 className="text-[18px] font-semibold text-white">
                {remito.numero_remito}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-[#555]">{formatDate(remito.fecha)}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${estadoColor[remito.estado] ?? estadoColor.pendiente}`}>
                  {estadoLabel[remito.estado] ?? "Pendiente"}
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/${id}/editar`}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-[#1a1a1c] px-3 text-[13px] text-[#888] active:opacity-60"
          >
            <Pencil className="size-3" />
            Editar
          </Link>
        </div>

        {/* ── RESUMEN ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/8 bg-[#161616] px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#444]">Cliente</p>
            <p className="mt-0.5 text-[13px] font-semibold text-white truncate">
              {remito.cliente_nombre || "Sin cliente"}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-[#161616] px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#444]">Total</p>
            <p className="mt-0.5 text-[15px] font-semibold text-white tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        {/* ── PRODUCTOS ── */}
        <div className="rounded-xl border border-white/8 bg-[#161616] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#444]">
              Productos
            </p>
            <p className="text-[11px] text-[#333]">
              {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
            </p>
          </div>

          <div className="divide-y divide-white/8">
            {remito.remito_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white truncate">
                    {item.descripcion}
                  </p>
                  <p className="text-[11px] text-[#555]">
                    {item.cantidad} {item.unidad}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-white tabular-nums shrink-0">
                  {formatCurrency(Number((item as { subtotal?: number | null }).subtotal ?? 0))}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 border-t border-white/8">
            <p className="text-[12px] font-semibold text-[#555]">Total</p>
            <p className="text-[15px] font-semibold text-white tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}