import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  return (
    <div className="min-h-dvh bg-background px-4">
      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center py-10">
        <h1 className="text-2xl font-bold">No se pudo confirmar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El link puede estar vencido o mal copiado. Probá entrar de nuevo o creá la cuenta otra vez.
        </p>

        <div className="mt-6 space-y-3">
          <Button asChild className="h-12 w-full rounded-xl text-base font-semibold">
            <Link href="/auth/login">Ir a login</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 w-full rounded-xl text-base font-semibold">
            <Link href="/auth/sign-up">Crear cuenta</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}