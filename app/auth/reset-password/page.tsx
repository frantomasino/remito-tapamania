"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, KeyRound } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function translateResetError(msg: string) {
  const m = msg.toLowerCase()

  if (m.includes("new password should be different")) {
    return "La nueva contraseña debe ser diferente a la anterior."
  }
  if (m.includes("password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres."
  }
  if (m.includes("invalid") && (m.includes("token") || m.includes("code"))) {
    return "El enlace de recuperación es inválido o ya venció. Pedí uno nuevo."
  }
  if (m.includes("expired")) {
    return "El enlace de recuperación venció. Pedí uno nuevo."
  }

  return msg
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session)
    })
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError(translateResetError(error.message))
      return
    }

    setSuccess("Contraseña cambiada con éxito. Ya podés ingresar.")

    setTimeout(() => {
      router.replace("/auth/login")
    }, 900)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 pb-8 pt-8">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-sm">
            <KeyRound className="size-7" />
          </div>

          <div className="mt-5">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">
              Nueva contraseña
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Elegí una nueva contraseña para volver a entrar a tu cuenta.
            </p>
          </div>
        </div>

        {!ready ? (
          <div className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border">
            <p className="text-sm text-foreground">No encontramos una sesión de recuperación activa.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Abrí este enlace desde el email de recuperación o pedí uno nuevo.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border">
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Nueva contraseña
                </Label>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-2xl pr-12"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm" className="text-sm font-medium text-foreground">
                  Confirmar contraseña
                </Label>

                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-11 rounded-2xl pr-12"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors"
                    aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
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

              {success && (
                <div
                  className="rounded-2xl border border-primary/15 bg-primary/10 px-3 py-2.5 text-sm text-foreground"
                  role="status"
                >
                  {success}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-12 rounded-2xl text-sm font-semibold"
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}