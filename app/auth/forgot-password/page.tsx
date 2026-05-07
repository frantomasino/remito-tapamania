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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-100 px-5">
      <div className="w-full max-w-sm">

        {/* ── LOGO + TÍTULO ── */}
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-4">
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
    <rect width="56" height="56" rx="14" fill="#0f172a"/>
    <rect x="14" y="12" width="22" height="32" rx="4" fill="white"/>
    <rect x="14" y="12" width="3" height="32" rx="1.5" fill="#1565c0"/>
    <rect x="19" y="17" width="14" height="3" rx="1.5" fill="#1565c0" opacity="0.9"/>
    <rect x="19" y="22" width="10" height="2.5" rx="1.25" fill="#e5e7eb"/>
    <rect x="19" y="27" width="12" height="2.5" rx="1.25" fill="#e5e7eb"/>
    <rect x="19" y="32" width="9" height="2.5" rx="1.25" fill="#e5e7eb"/>
    <circle cx="38" cy="22" r="10" fill="#22c55e"/>
    <polyline points="33,22 37,26 43,17" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</div>
          <h1 className="text-[22px] font-semibold text-gray-900">Recuperar contraseña</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Te mandamos un link para restablecer el acceso.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[12px] font-medium text-gray-600">Email</label>
              <input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#1565c0] focus:bg-white"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600" role="alert">
                {error}
              </div>
            )}

            {msg && (
              <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5" role="status">
                <MailSearch className="mt-0.5 size-4 shrink-0 text-[#1565c0]" />
                <p className="text-[13px] text-gray-800">{msg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 w-full rounded-xl bg-[#1565c0] text-[14px] font-semibold text-white active:opacity-80 disabled:opacity-40 shadow-sm"
            >
              {loading ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[13px] text-gray-500">
          <Link href="/auth/login" className="font-medium text-[#1565c0]">
            Volver a ingresar
          </Link>
        </p>

      </div>
    </div>
  )
}