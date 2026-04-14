import Link from "next/link"
import { MailCheck } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-100 px-5">
      <div className="w-full max-w-sm text-center">

        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#1565c0] shadow-sm">
          <MailCheck className="size-6 text-white" />
        </div>

        <h1 className="text-[22px] font-semibold text-gray-900">Revisá tu email</h1>
        <p className="mt-2 text-[13px] text-gray-500">
          Te mandamos un link de confirmación. Tocalo para activar tu cuenta.
        </p>

        <Link
          href="/auth/login"
          className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#1565c0] text-[14px] font-semibold text-white active:opacity-80 shadow-sm"
        >
          Volver a ingresar
        </Link>

      </div>
    </div>
  )
}