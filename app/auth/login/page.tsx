"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError("Email o contraseña incorrectos")
      setLoading(false)
      return
    }

    try {
      const userId = signInData.user?.id
      const userEmail = signInData.user?.email ?? email

      if (userId) {
        await supabase.from("profiles").upsert(
          {
            id: userId,
            email: userEmail,
            last_login_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
      }
    } catch {
      // nada
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 pb-8 pt-8">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-sm">
            <ClipboardList className="size-7" />
          </div>

          <div className="mt-5">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">
              Ingresar
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Entrá para cargar pedidos, imprimir remitos y seguir el recorrido.
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Contraseña
              </Label>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-2xl pr-12"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>

              <div className="pt-0.5 text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {error && (
              <div
                className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-12 rounded-2xl text-sm font-semibold"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link
            href="/auth/sign-up"
            className="font-medium text-primary underline underline-offset-4"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}