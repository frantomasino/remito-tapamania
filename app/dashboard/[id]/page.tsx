import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import type { RemitoWithItems } from "@/lib/remito-types"
import { FormaPagoSelector } from "@/components/forma-pago-selector"

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

function formatCurrency(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
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

  const remito = data as RemitoWithItems & { forma_pago?: string | null }
  const total = Number(remito.total || 0)
  const itemCount = remito.remito_items.length

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-3">
      <div className="flex flex-col gap-3">

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pedidos"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 active:opacity-60 shadow-sm"
            aria-label="Volver">
            <ArrowLeft className="size-3.5" />
          </Link>
          <div>
            <h1 className="text-[18px] font-semibold text-gray-900">{remito.numero_remito}</h1>
            <p className="text-[11px] text-gray-500">{formatDate(remito.fecha)}</p>
          </div>
        </div>

        {/* ── RESUMEN ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Cliente</p>
            <p className="mt-0.5 text-[13px] font-semibold text-gray-900 truncate">
              {remito.cliente_nombre || "Sin cliente"}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Total</p>
            <p className="mt-0.5 text-[15px] font-semibold text-gray-900 tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        {/* ── FORMA DE PAGO ── */}
        <FormaPagoSelector remitoId={id} initialFormaPago={remito.forma_pago ?? null} initialCliente={remito.cliente_nombre ?? null} />

        {/* ── PRODUCTOS ── */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-gray-50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Productos</p>
            <p className="text-[11px] text-gray-400">{itemCount} {itemCount === 1 ? "ítem" : "ítems"}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {remito.remito_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{item.descripcion}</p>
                  <p className="text-[11px] text-gray-400">
                    {item.cantidad}{item.opcion ? ` · ${item.opcion}` : ""}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-gray-900 tabular-nums shrink-0">
                  {formatCurrency(Number((item as { subtotal?: number | null }).subtotal ?? 0))}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-200 bg-gray-50">
            <p className="text-[12px] font-semibold text-gray-500">Total</p>
            <p className="text-[15px] font-semibold text-gray-900 tabular-nums">{formatCurrency(total)}</p>
          </div>
        </div>

      </div>
    </div>
  )
}