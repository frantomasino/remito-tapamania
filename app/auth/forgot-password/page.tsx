"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { MailSearch } from "lucide-react"

function translateForgotError(msg: string) {
  if (msg.toLowerCase().includes("rate limit"))
    return "Se excedió el límite de envíos. Esperá unos minutos y probá de nuevo."
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
    if (error) { setError(translateForgotError(error.message)); return }
    setMsg("Listo. Te mandamos un email con el link para recuperar tu contraseña.")
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#111214] px-5 text-white">
      <div className="w-full max-w-sm">

        {/* ── TÍTULO ── */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold text-white">Recuperar contraseña</h1>
          <p className="mt-1 text-[13px] text-[#555]">
            Te mandamos un link para restablecer el acceso.
          </p>
        </div>

        {/* ── FORMULARIO ── */}
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[12px] font-medium text-[#888]">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-white/20"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-300" role="alert">
              {error}
            </div>
          )}

          {msg && (
            <div className="flex items-start gap-2 rounded-xl border border-[#1976d2]/20 bg-[#1976d2]/10 px-3 py-2.5" role="status">
              <MailSearch className="mt-0.5 size-4 shrink-0 text-[#5aa9ff]" />
              <p className="text-[13px] text-white">{msg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 h-11 w-full rounded-xl bg-[#1976d2] text-[14px] font-semibold text-white active:opacity-80 disabled:opacity-40"
          >
            {loading ? "Enviando..." : "Enviar link"}
          </button>

          <p className="text-center text-[13px] text-[#555]">
            <Link href="/auth/login" className="text-[#5aa9ff]">
              Volver a ingresar
            </Link>
          </p>
        </form>

      </div>
    </div>
  )
}