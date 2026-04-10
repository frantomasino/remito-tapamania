"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

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
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

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
          { id: userId, email: userEmail, last_login_at: new Date().toISOString() },
          { onConflict: "id" }
        )
      }
    } catch {}

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#111214] px-5 text-white">
      <div className="w-full max-w-sm">

        {/* ── LOGO + TÍTULO ── */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-2xl bg-[#1976d2]">
            {/* Ícono simple: dos líneas como un remito */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="14" height="2" rx="1" fill="white"/>
              <rect x="2" y="7" width="10" height="2" rx="1" fill="white"/>
              <rect x="2" y="12" width="12" height="2" rx="1" fill="white"/>
            </svg>
          </div>
          <h1 className="text-[22px] font-semibold text-white">Tapamanía Remitos</h1>
          <p className="mt-1 text-[13px] text-[#555]">Ingresá para continuar</p>
        </div>

        {/* ── FORMULARIO ── */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[12px] font-medium text-[#888]">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 pr-11 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-white/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555]"
                aria-label={showPassword ? "Ocultar" : "Mostrar"}
              >
                {showPassword ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
            </div>
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-[12px] text-[#5aa9ff]"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-300" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 h-11 w-full rounded-xl bg-[#1976d2] text-[14px] font-semibold text-white active:opacity-80 disabled:opacity-40"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-[#555]">
          ¿No tenés cuenta?{" "}
          <Link href="/auth/sign-up" className="text-[#5aa9ff]">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}