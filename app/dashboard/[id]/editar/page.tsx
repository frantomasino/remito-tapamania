import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { RemitoWithItems } from "@/lib/remito-types"
import { EditarPedidoClient } from "@/components/editar-pedido-client"
import type { LineItem } from "@/lib/remito-types"

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

export default async function EditarPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase
      .from("remitos")
      .select("*, remito_items(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("empresa, vendedor, telefono, alias")
      .eq("id", user.id)
      .single(),
  ])

  if (error || !data) notFound()

  const remito = data as RemitoWithItems & { forma_pago?: string | null; price_list_id?: string | null }

  const initialItems: LineItem[] = remito.remito_items.map((item) => ({
    product: {
      descripcion: item.descripcion,
      precio: Number(item.precio_unitario ?? 0),
    },
    cantidad: item.cantidad,
    subtotal: Number((item as { subtotal?: number | null }).subtotal ?? 0),
    opcion: (item as { opcion?: string | null }).opcion ?? undefined,
    devolucion: 0,
  }))

  return (
    <EditarPedidoClient
      remitoId={id}
      numeroRemito={remito.numero_remito}
      fechaRemito={formatDate(remito.fecha)}
      clienteNombre={remito.cliente_nombre ?? null}
      priceListUuid={remito.price_list_id ?? ""}
      initialItems={initialItems}
      empresa={profile?.empresa ?? ""}
      vendedor={profile?.vendedor ?? ""}
      telefono={profile?.telefono ?? ""}
      alias={profile?.alias ?? ""}
    />
  )
}