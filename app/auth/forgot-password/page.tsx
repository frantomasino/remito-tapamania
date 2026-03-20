"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, MailSearch } from "lucide-react"

function translateForgotError(msg: string) {
  const m = msg.toLowerCase()
  if (m.includes("rate limit")) {
    return "Se excedió el límite de envíos. Esperá unos minutos y probá de nuevo."
  }
  return msg
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMsg(null)

    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError(translateForgotError(error.message))
      return
    }

    setMsg("Listo. Te mandamos un email con el link para recuperar tu contraseña.")
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
              Recuperar contraseña
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Ingresá tu email y te mandamos un enlace para restablecer el acceso.
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
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

            {error && (
              <div
                className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            {msg && (
              <div
                className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/10 px-3 py-3 text-foreground"
                role="status"
              >
                <MailSearch className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm">{msg}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-12 rounded-2xl text-sm font-semibold"
            >
              {loading ? "Enviando..." : "Enviar link"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/auth/login"
                className="font-medium text-primary underline underline-offset-4"
              >
                Volver a ingresar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}