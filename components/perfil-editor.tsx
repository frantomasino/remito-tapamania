"use client"

import { useState, useCallback } from "react"
import { Building2, User, Phone, Pencil, Check, X, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface PerfilEditorProps {
  userId: string
  initialEmpresa: string
  initialVendedor: string
  initialTelefono: string
}

export function PerfilEditor({ userId, initialEmpresa, initialVendedor, initialTelefono }: PerfilEditorProps) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [saved, setSaved] = useState({
    empresa: initialEmpresa,
    vendedor: initialVendedor,
    telefono: initialTelefono,
  })
  const [form, setForm] = useState(saved)

  const startEdit = () => {
    setForm(saved)
    setEditing(true)
    setError(null)
  }

  const cancel = () => {
    setForm(saved)
    setEditing(false)
    setError(null)
  }

  const save = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      const { error } = await supabase
        .from("profiles")
        .update({
          empresa: form.empresa.trim() || null,
          vendedor: form.vendedor.trim() || null,
          telefono: form.telefono.trim() || null,
        })
        .eq("id", userId)
      if (error) { setError("No se pudo guardar"); return }
      setSaved({ ...form, empresa: form.empresa.trim(), vendedor: form.vendedor.trim(), telefono: form.telefono.trim() })
      setEditing(false)
    } catch {
      setError("Error inesperado")
    } finally {
      setLoading(false)
    }
  }, [form, userId])

  const fields = [
    { key: "empresa" as const, label: "Empresa", icon: Building2, placeholder: "Ej: Tapamanía", type: "text" },
    { key: "vendedor" as const, label: "Vendedor", icon: User, placeholder: "Ej: Juan García", type: "text" },
    { key: "telefono" as const, label: "Teléfono", icon: Phone, placeholder: "Ej: +54 11 1234-5678", type: "tel" },
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header de la card */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Datos del negocio</p>
        {!editing ? (
          <button type="button" onClick={startEdit}
            className="flex h-7 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-[11px] font-medium text-gray-500 active:opacity-60">
            <Pencil className="size-3" />Editar
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={cancel} disabled={loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 active:opacity-60">
              <X className="size-3.5" />
            </button>
            <button type="button" onClick={save} disabled={loading}
              className="flex h-7 items-center gap-1 rounded-lg bg-[#1565c0] px-2 text-[11px] font-semibold text-white active:opacity-80 disabled:opacity-40">
              {loading ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </div>

      {/* Campos */}
      <div className="divide-y divide-gray-100">
        {fields.map((field) => (
          <div key={field.key} className="flex items-center gap-3 px-3 py-3">
            <field.icon className="size-4 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{field.label}</p>
              {editing ? (
                <input
                  type={field.type}
                  value={form[field.key]}
                  onChange={(e) => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel() }}
                  placeholder={field.placeholder}
                  className="mt-0.5 w-full text-[13px] font-semibold text-gray-900 bg-transparent outline-none border-b border-[#1565c0] pb-0.5 placeholder:font-normal placeholder:text-gray-400"
                />
              ) : (
                <p className="mt-0.5 text-[13px] font-semibold text-gray-900 truncate">
                  {saved[field.key] || <span className="text-gray-400 font-normal">Sin definir</span>}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="px-3 pb-2 text-[12px] text-red-500">{error}</p>}
    </div>
  )
}