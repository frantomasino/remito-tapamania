import Link from "next/link"
import { ClipboardList, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#111214] px-5 pb-8 pt-8 text-white">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-[#1976d2] text-white shadow-[0_8px_24px_rgba(25,118,210,0.18)]">
            <ClipboardList className="size-7" />
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a9a9ae]">
              Tapamanía
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
              Revisá tu email
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#9e9ea6]">
              Te mandamos un link de confirmación para activar tu cuenta y empezar a usar la app.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="rounded-2xl border border-white/10 bg-[#232326] px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#1976d2] text-white">
                <MailCheck className="size-5" />
              </div>

              <div className="min-w-0">
                <p className="text-base font-semibold text-white">Confirmá tu cuenta</p>
                <p className="mt-1 text-sm leading-relaxed text-[#9e9ea6]">
                  Abrí el email que te enviamos y tocá el enlace para terminar el registro.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button asChild className="h-12 w-full rounded-2xl bg-[#1976d2] text-sm font-semibold text-white hover:bg-[#1c82e4]">
              <Link href="/auth/login">Volver a ingresar</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}