import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-dvh bg-background px-4">
      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center py-10">
        <h1 className="text-2xl font-bold">Revisá tu email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Te mandamos un link de confirmación. Abrilo para activar tu cuenta y entrar.
        </p>

        <div className="mt-6">
          <Button asChild className="h-12 w-full rounded-xl text-base font-semibold">
            <Link href="/auth/login">Volver a ingresar</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}