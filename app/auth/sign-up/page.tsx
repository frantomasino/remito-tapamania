"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      setLoading(false)
      return
    }

    const supabase = createClient()
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
      window.location.origin

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.push("/auth/sign-up-success")
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#111214] px-5 text-white">
      <div className="w-full max-w-sm">

        {/* ── TÍTULO ── */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold text-white">Crear cuenta</h1>
          <p className="mt-1 text-[13px] text-[#555]">Tapamanía · Sistema de remitos</p>
        </div>

        {/* ── FORMULARIO ── */}
        <form onSubmit={handleSignUp} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[12px] font-medium text-[#888]">Email</label>
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
            <label htmlFor="password" className="text-[12px] font-medium text-[#888]">Contraseña</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-password" className="text-[12px] font-medium text-[#888]">Confirmar contraseña</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repetí tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 pr-11 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-white/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555]"
                aria-label={showConfirmPassword ? "Ocultar" : "Mostrar"}
              >
                {showConfirmPassword ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
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
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-[#555]">
          ¿Ya tenés cuenta?{" "}
          <Link href="/auth/login" className="text-[#5aa9ff]">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  )
}