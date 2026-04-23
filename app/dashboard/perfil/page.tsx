import { LogOut, Mail, Tags, Info, MessageCircle } from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PerfilEditor } from "@/components/perfil-editor"

type PriceListId = "minorista" | "mayorista" | "oferta"

function getPriceListLabel(value?: string | null) {
  switch (value as PriceListId) {
    case "minorista": return "Minorista"
    case "mayorista": return "Mayorista"
    case "oferta": return "Oferta"
    default: return "Sin definir"
  }
}

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("selected_price_list, app_version, empresa, vendedor, telefono")
    .eq("id", user.id)
    .single()

  const selectedPriceList = profile?.selected_price_list ?? null
  const appVersion = profile?.app_version ?? "1.0.0"
  const empresa = profile?.empresa ?? ""
  const vendedor = profile?.vendedor ?? ""
  const telefono = profile?.telefono ?? ""

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-3">
      <div className="flex flex-col gap-3">

        <div className="mb-1">
          <h1 className="text-[18px] font-semibold text-gray-900">Cuenta</h1>
          <p className="text-[12px] text-gray-500">Configuración y sesión</p>
        </div>

        {/* ── EMAIL ── */}
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Mail className="size-4 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Usuario</p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-gray-900">
                {user.email || "Sin email"}
              </p>
            </div>
          </div>
        </div>

        {/* ── LISTA ACTIVA ── */}
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Tags className="size-4 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Lista activa por defecto</p>
              <p className="mt-0.5 text-[13px] font-semibold text-gray-900">
                {getPriceListLabel(selectedPriceList)}
              </p>
            </div>
          </div>
        </div>

        {/* ── DATOS DEL NEGOCIO ── */}
        <PerfilEditor
          userId={user.id}
          initialEmpresa={empresa}
          initialVendedor={vendedor}
          initialTelefono={telefono}
        />

        {/* ── VERSIÓN ── */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-3">
              <Info className="size-4 shrink-0 text-gray-400" />
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Versión</p>
            </div>
            <p className="text-[13px] font-semibold text-gray-900">{appVersion}</p>
          </div>
        </div>

        {/* ── SOPORTE ── */}
        <a
          href="https://wa.me/5491131256510?text=Hola%2C%20necesito%20ayuda%20con%20la%20app%20de%20remitos"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-white py-2.5 text-[13px] font-medium text-green-600 active:opacity-60 shadow-sm">
          <MessageCircle className="size-3.5" />
          Soporte por WhatsApp
        </a>

        {/* ── CERRAR SESIÓN ── */}
        <form action="/auth/signout" method="post" className="mt-1">
          <button type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-2.5 text-[13px] font-medium text-red-500 active:opacity-60 shadow-sm">
            <LogOut className="size-3.5" />
            Cerrar sesión
          </button>
        </form>

      </div>
    </div>
  )
}