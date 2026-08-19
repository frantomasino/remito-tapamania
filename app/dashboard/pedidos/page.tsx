import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PedidosClient } from "@/components/pedidos-client"
import type { SaleRecord } from "@/lib/remito-types"

export const revalidate = 30

type RemitoRow = {
  id: string
  numero_remito: string
  fecha: string
  cliente_nombre: string | null
  total: number
  price_list_id: string | null
  forma_pago: string | null
}

export default async function PedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data, error } = await supabase
    .from("remitos")
    .select("id, numero_remito, fecha, cliente_nombre, total, price_list_id, forma_pago")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) console.error("Error cargando pedidos", error)

  const records: SaleRecord[] =
    (data as RemitoRow[] | null)?.map((row) => ({
      id: row.id,
      numero: row.numero_remito,
      fecha: row.fecha,
      cliente: row.cliente_nombre || "Sin cliente",
      formaPago: row.price_list_id || "minorista",
      formaPagoCliente: row.forma_pago || null,
      total: Number(row.total || 0),
      itemCount: 0,
    })) ?? []

  return <PedidosClient records={records} userId={user.id} />
}