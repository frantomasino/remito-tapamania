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
  const [loadingGoogle, setLoadingGoogle] = useState(false)
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
        void supabase.from("profiles").upsert(
          { id: userId, email: userEmail, last_login_at: new Date().toISOString() },
          { onConflict: "id" }
        )
      }
    } catch {}

    router.push("/dashboard/nuevo")
    router.refresh()
  }

  async function handleGoogleLogin() {
    setLoadingGoogle(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError("No se pudo iniciar sesión con Google")
      setLoadingGoogle(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-100 px-5">
      <div className="w-full max-w-sm">

        {/* ── LOGO + TÍTULO ── */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#1565c0] shadow-sm">
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="14" height="2" rx="1" fill="white"/>
              <rect x="2" y="7" width="10" height="2" rx="1" fill="white"/>
              <rect x="2" y="12" width="12" height="2" rx="1" fill="white"/>
            </svg>
          </div>
          <h1 className="text-[22px] font-semibold text-gray-900">Rutix</h1>
          <p className="mt-1 text-[13px] text-gray-500">Ingresá para continuar</p>
        </div>

        {/* ── CARD ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

          {/* Botón Google — borde más marcado y fondo gris suave */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loading}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-[14px] font-medium text-gray-700 active:bg-gray-100 disabled:opacity-40 transition-colors mb-4"
          >
            {loadingGoogle ? (
              <svg className="size-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {loadingGoogle ? "Conectando..." : "Continuar con Google"}
          </button>

          {/* Divisor más visible */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">o ingresá con email</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[12px] font-medium text-gray-600">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 pr-11 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#1565c0] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
              </div>
              <div className="text-right">
                <Link href="/auth/forgot-password" className="text-[12px] text-[#1565c0]">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || loadingGoogle}
              className="mt-1 h-11 w-full rounded-xl bg-[#1565c0] text-[14px] font-semibold text-white active:opacity-80 disabled:opacity-40 shadow-sm"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[13px] text-gray-500">
          ¿No tenés cuenta?{" "}
          <Link href="/auth/sign-up" className="font-medium text-[#1565c0]">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}