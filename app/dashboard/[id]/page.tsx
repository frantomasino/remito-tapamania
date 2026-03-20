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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-5 pt-4">
      <header className="app-card">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/pedidos"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background ring-1 ring-border"
            aria-label="Volver a pedidos"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ReceiptText className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="app-subtitle">Detalle del pedido</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="app-page-title truncate">#{remito.numero_remito}</h1>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
              </div>
            </div>

            <p className="app-subtitle mt-3">{formatDate(remito.fecha)}</p>
          </div>

          <Button asChild variant="outline" size="default">
            <Link href={`/dashboard/${id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="app-card">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background ring-1 ring-border">
              <Store className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-0">
              <p className="app-meta font-medium">Comercio</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {remito.cliente_nombre || "Sin comercio"}
              </p>
            </div>
          </div>
        </div>

        <div className="app-card">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background ring-1 ring-border">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-0">
              <p className="app-meta font-medium">Fecha</p>
              <p className="mt-1 text-sm font-medium text-foreground">{formatDate(remito.fecha)}</p>
            </div>
          </div>
        </div>

        <div className="app-card">
          <p className="app-meta font-medium">Total</p>
          <p className="mt-2 text-xl font-semibold leading-none text-foreground tabular-nums">
            {formatCurrency(total)}
          </p>
          <p className="app-subtitle mt-2">
            {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
          </p>
        </div>
      </section>

      <section className="app-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="app-section-title">Productos</h2>
            <p className="app-subtitle mt-1">
              {itemCount} {itemCount === 1 ? "producto cargado" : "productos cargados"}
            </p>
          </div>

          <div className="text-right">
            <p className="app-meta font-medium">Total</p>
            <p className="text-base font-semibold text-foreground tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {remito.remito_items.map((item) => (
            <article key={item.id} className="app-card-soft px-3 py-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-card ring-1 ring-border">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-foreground">
                    {item.descripcion}
                  </p>

                  <p className="app-subtitle mt-1">
                    {item.cantidad} {item.unidad}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-foreground tabular-nums">
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