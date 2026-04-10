"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function translateResetError(msg: string) {
  const m = msg.toLowerCase()
  if (m.includes("new password should be different")) return "La nueva contraseña debe ser diferente a la anterior."
  if (m.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres."
  if (m.includes("invalid") && (m.includes("token") || m.includes("code"))) return "El enlace es inválido o ya venció. Pedí uno nuevo."
  if (m.includes("expired")) return "El enlace venció. Pedí uno nuevo."
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
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session))
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(translateResetError(error.message)); return }
    setSuccess("Contraseña cambiada. Redirigiendo...")
    setTimeout(() => router.replace("/auth/login"), 900)
  }

  const inputClass = "h-11 w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 pr-11 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-white/20"

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#111214] px-5 text-white">
      <div className="w-full max-w-sm">

        <div className="mb-6">
          <h1 className="text-[22px] font-semibold text-white">Nueva contraseña</h1>
          <p className="mt-1 text-[13px] text-[#555]">Elegí una nueva contraseña para tu cuenta.</p>
        </div>

        {!ready ? (
          <div className="rounded-xl border border-white/8 bg-[#161616] px-4 py-4">
            <p className="text-[13px] text-white">No encontramos una sesión de recuperación activa.</p>
            <p className="mt-1 text-[12px] text-[#555]">Abrí el link desde el email de recuperación o pedí uno nuevo.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[12px] font-medium text-[#888]">Nueva contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555]"
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-[12px] font-medium text-[#888]">Confirmar contraseña</label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555]"
                  aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-300" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-[#1976d2]/20 bg-[#1976d2]/10 px-3 py-2 text-[13px] text-white" role="status">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 w-full rounded-xl bg-[#1976d2] text-[14px] font-semibold text-white active:opacity-80 disabled:opacity-40"
            >
              {loading ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}