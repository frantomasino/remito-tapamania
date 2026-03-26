import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { ArrowLeft, Pencil, Store, Calendar, Package, ReceiptText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import type { RemitoWithItems } from "@/lib/remito-types"

const estadoConfig = {
  pendiente: { label: "Pendiente", variant: "secondary" as const },
  entregado: { label: "Entregado", variant: "default" as const },
  cancelado: { label: "Cancelado", variant: "destructive" as const },
}

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

export default async function RemitoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data, error } = await supabase
    .from("remitos")
    .select("*, remito_items(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    notFound()
  }

  const remito = data as RemitoWithItems
  const cfg = estadoConfig[remito.estado] ?? estadoConfig.pendiente
  const total = Number(remito.total || 0)
  const itemCount = remito.remito_items.length

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-5 pt-4 text-white">
      <header className="rounded-[28px] border border-white/10 bg-[#2a2926] shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-start gap-3 px-4 py-4">
          <Link
            href="/dashboard/pedidos"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
            aria-label="Volver a pedidos"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#1976d2] text-white">
                <ReceiptText className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b0b0b6]">
                  Detalle del pedido
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[20px] font-semibold tracking-tight text-white">
                    #{remito.numero_remito}
                  </h1>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
              </div>
            </div>

            <p className="mt-3 text-sm text-[#b0b0b6]">{formatDate(remito.fecha)}</p>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/10 bg-transparent text-white hover:bg-white/5"
          >
            <Link href={`/dashboard/${id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-3">
        <div className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#232326] ring-1 ring-white/10">
              <Store className="h-4 w-4 text-[#9e9ea6]" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#a9a9ae]">
                Comercio
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {remito.cliente_nombre || "Sin comercio"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#232326] ring-1 ring-white/10">
              <Calendar className="h-4 w-4 text-[#9e9ea6]" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#a9a9ae]">
                Fecha
              </p>
              <p className="mt-1 text-sm font-medium text-white">{formatDate(remito.fecha)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#a9a9ae]">
            Total
          </p>
          <p className="mt-2 text-[24px] font-bold leading-none text-white tabular-nums">
            {formatCurrency(total)}
          </p>
          <p className="mt-2 text-sm text-[#9e9ea6]">
            {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-white">Productos</h2>
            <p className="mt-1 text-sm text-[#9e9ea6]">
              {itemCount} {itemCount === 1 ? "producto cargado" : "productos cargados"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#a9a9ae]">
              Total
            </p>
            <p className="text-base font-semibold text-white tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {remito.remito_items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-[#232326] px-3 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#1b1b1d] ring-1 ring-white/10">
                  <Package className="h-4 w-4 text-[#9e9ea6]" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-white">
                    {item.descripcion}
                  </p>

                  <p className="mt-1 text-sm text-[#9e9ea6]">
                    {item.cantidad} {item.unidad}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-white tabular-nums">
                    {formatCurrency(Number((item as { subtotal?: number | null }).subtotal ?? 0))}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}