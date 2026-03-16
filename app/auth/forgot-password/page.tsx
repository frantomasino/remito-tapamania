"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function translateForgotError(msg: string) {
  const m = msg.toLowerCase()
  if (m.includes("rate limit")) return "Se excedió el límite de envíos. Esperá unos minutos y probá de nuevo."
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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          Ingresá tu email y te mandamos un link para cambiar la contraseña.
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl"
            />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {msg && <p className="text-sm text-green-600 text-center">{msg}</p>}

          <Button type="submit" disabled={loading} className="h-12 rounded-xl text-base font-semibold">
            {loading ? "Enviando..." : "Enviar link"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/login" className="text-primary underline underline-offset-4">
              Volver a ingresar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}