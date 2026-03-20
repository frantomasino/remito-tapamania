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
      <div className="space-y-6">
        <header>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <UserCircle2 className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold leading-none text-foreground">Cuenta</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Información de la cuenta y sesión activa.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl bg-card px-4 py-4 ring-1 ring-border">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-background text-muted-foreground ring-1 ring-border">
              <Mail className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground">Usuario</p>
              <p className="mt-1 break-all text-base font-semibold text-foreground">
                {user.email || "Sin email"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Esta cuenta está activa en este dispositivo.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-card px-4 py-4 ring-1 ring-border">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-background text-muted-foreground ring-1 ring-border">
              <ShieldCheck className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">Sesión</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cerrá sesión cuando termines de usar la app.
              </p>

              <form action="/auth/signout" method="post" className="mt-4">
                <Button
                  type="submit"
                  variant="outline"
                  className="h-11 w-full rounded-2xl text-sm"
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