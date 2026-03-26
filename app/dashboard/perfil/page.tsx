import {
  LogOut,
  Mail,
  UserCircle2,
  ShieldCheck,
  Tags,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"

type PriceListId = "minorista" | "mayorista" | "oferta"

function getPriceListLabel(value?: string | null) {
  switch (value as PriceListId) {
    case "minorista":
      return "Minorista"
    case "mayorista":
      return "Mayorista"
    case "oferta":
      return "Oferta"
    default:
      return "Sin definir"
  }
}

function getPriceListBadgeClass(value?: string | null) {
  switch (value as PriceListId) {
    case "minorista":
      return "border-sky-400/20 bg-sky-500/10 text-sky-200"
    case "mayorista":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
    case "oferta":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200"
    default:
      return "border-white/10 bg-white/5 text-[#d7d7db]"
  }
}

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("selected_price_list")
    .eq("id", user.id)
    .single()

  const selectedPriceList = profile?.selected_price_list ?? null

  return (
    <div className="px-4 pb-5 pt-4 text-white">
      <div className="space-y-4">
        <header className="rounded-[28px] border border-white/10 bg-[#2a2926] px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#1976d2] text-white">
              <UserCircle2 className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b0b0b6]">
                Cuenta
              </p>
              <h1 className="mt-1 text-xl font-semibold leading-none text-white">Perfil</h1>
              <p className="mt-2 text-sm text-[#9e9ea6]">
                Información de la cuenta y configuración actual.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#1b1b1d] px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#232326] text-[#9e9ea6] ring-1 ring-white/10">
              <Mail className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#a9a9ae]">
                Usuario
              </p>
              <p className="mt-1 break-all text-base font-semibold text-white">
                {user.email || "Sin email"}
              </p>
              <p className="mt-2 text-sm text-[#9e9ea6]">
                Esta cuenta está activa en este dispositivo.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1b1b1d] px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#232326] text-[#9e9ea6] ring-1 ring-white/10">
              <Tags className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#a9a9ae]">
                Lista activa
              </p>

              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getPriceListBadgeClass(
                    selectedPriceList
                  )}`}
                >
                  {getPriceListLabel(selectedPriceList)}
                </span>
              </div>

              <p className="mt-2 text-sm text-[#9e9ea6]">
                Esta es la lista que queda seleccionada por defecto al abrir un nuevo pedido.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1b1b1d] px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#232326] text-[#9e9ea6] ring-1 ring-white/10">
              <ShieldCheck className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-white">Sesión</h2>
              <p className="mt-1 text-sm text-[#9e9ea6]">
                Cerrá sesión cuando termines de usar la app.
              </p>

              <form action="/auth/signout" method="post" className="mt-4">
                <Button
                  type="submit"
                  variant="outline"
                  className="h-11 w-full rounded-2xl border-white/10 bg-transparent text-sm text-white hover:bg-white/5"
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}