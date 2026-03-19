import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { ArrowLeft, Pencil, Store, Calendar, Package } from "lucide-react"
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 pb-5 pt-4">
      <header className="rounded-2xl border bg-card px-4 py-4">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Detalle
            </p>

            <div className="mt-1 flex items-center gap-2">
              <h1 className="truncate text-base font-semibold text-foreground">
                #{remito.numero_remito}
              </h1>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>

            <p className="mt-1 text-[12px] text-muted-foreground">
              {formatDate(remito.fecha)}
            </p>
          </div>

          <Button asChild variant="outline" className="h-10 rounded-xl px-3">
            <Link href={`/dashboard/${id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border bg-card px-4 py-4">
        <div className="mb-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Datos
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background border">
              <Store className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Comercio</p>
              <p className="text-sm text-foreground">{remito.cliente_nombre || "Sin comercio"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background border">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Fecha</p>
              <p className="text-sm text-foreground">{formatDate(remito.fecha)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Productos
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {remito.remito_items.length} {remito.remito_items.length === 1 ? "ítem" : "ítems"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(total)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {remito.remito_items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border bg-background px-3 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-snug text-foreground">
                    {item.descripcion}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {item.cantidad} {item.unidad}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[12px] font-semibold text-foreground">
  {formatCurrency(
    Number((item as { subtotal?: number | null }).subtotal ?? 0)
  )}
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