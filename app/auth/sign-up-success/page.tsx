import Link from "next/link"
import { ClipboardList, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 pb-8 pt-8">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-sm">
            <ClipboardList className="size-7" />
          </div>

          <div className="mt-5">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">
              Revisá tu email
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Te mandamos un link de confirmación para activar tu cuenta y empezar a usar la app.
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border">
          <div className="rounded-2xl bg-background px-4 py-4 ring-1 ring-border">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MailCheck className="size-5" />
              </div>

              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground">Confirmá tu cuenta</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Abrí el email que te enviamos y tocá el enlace para terminar el registro.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button asChild className="h-12 w-full rounded-2xl text-sm font-semibold">
              <Link href="/auth/login">Volver a ingresar</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}