"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Pencil,
  Trash2,
  User,
  MapPin,
  Phone,
  Calendar,
  Package,
} from "lucide-react"
import type { RemitoWithItems } from "@/lib/remitos"

const estadoConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  entregado: { label: "Entregado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export default function RemitoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [remito, setRemito] = useState<RemitoWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const remitoId = params.id as string

  const fetchRemito = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("remitos")
      .select("*, remito_items(*)")
      .eq("id", remitoId)
      .single()

    if (data) setRemito(data as RemitoWithItems)
    setLoading(false)
  }, [remitoId])

  useEffect(() => {
    fetchRemito()
  }, [fetchRemito])

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from("remitos").delete().eq("id", remitoId)
    router.push("/dashboard")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (!remito) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-base text-muted-foreground">Remito no encontrado</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/dashboard">Volver</Link>
        </Button>
      </div>
    )
  }

  const cfg = estadoConfig[remito.estado] || estadoConfig.pendiente

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <header className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors active:bg-accent"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-1 items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">
            #{remito.numero_remito}
          </h1>
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
        </div>
      </header>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          asChild
          variant="outline"
          className="flex-1 h-11 rounded-xl gap-2"
        >
          <Link href={`/dashboard/${remitoId}/editar`}>
            <Pencil className="h-4 w-4" />
            Editar
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="h-11 rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="mx-4 rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar remito</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion no se puede deshacer. Se eliminara el remito #{remito.numero_remito} y todos sus items.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Cliente info */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Cliente
        </h2>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground">{remito.cliente_nombre}</span>
          </div>
          {remito.cliente_direccion && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{remito.cliente_direccion}</span>
            </div>
          )}
          {remito.cliente_telefono && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{remito.cliente_telefono}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground capitalize">{formatDate(remito.fecha)}</span>
          </div>
        </div>
      </section>

      {/* Items */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Items ({remito.remito_items.length})
        </h2>
        <div className="flex flex-col gap-2">
          {remito.remito_items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg bg-background p-3"
            >
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">
                  {item.descripcion}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.cantidad} {item.unidad}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Observaciones */}
      {remito.observaciones && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Observaciones
          </h2>
          <p className="text-sm text-foreground leading-relaxed">
            {remito.observaciones}
          </p>
        </section>
      )}
    </div>
  )
}
