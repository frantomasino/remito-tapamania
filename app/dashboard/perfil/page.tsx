import { LogOut, Mail, UserCircle2, ShieldCheck } from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="px-4 pb-5 pt-4">
      <div className="space-y-5">
        <header>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <UserCircle2 className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Cuenta
              </p>
              <h1 className="mt-1 text-xl font-semibold leading-none text-foreground">
                Perfil
              </h1>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Información de la cuenta y sesión activa.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl bg-muted/25 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-background text-muted-foreground">
              <Mail className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Usuario
              </p>
              <p className="mt-1 text-[15px] font-semibold text-foreground break-all">
                {user.email || "Sin email"}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Esta cuenta está activa en este dispositivo.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-muted/25 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-background text-muted-foreground">
              <ShieldCheck className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Sesión
              </p>
              <h2 className="mt-1 text-base font-semibold text-foreground">
                Cerrar sesión
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Salí de la cuenta cuando termines de usar la app.
              </p>

              <form action="/auth/signout" method="post" className="mt-4">
                <Button
                  type="submit"
                  variant="outline"
                  className="h-11 w-full rounded-2xl text-[14px]"
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