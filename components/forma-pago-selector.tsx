"use client"

import { useState, useCallback, useRef } from "react"
import { Banknote, Smartphone, Loader2, Pencil, Check, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type FormaPago = "efectivo" | "mercadopago" | null

const OPCIONES: { id: FormaPago; label: string; icon: typeof Banknote; color: string }[] = [
  { id: "efectivo", label: "Efectivo", icon: Banknote, color: "border-green-300 bg-green-50 text-green-700" },
  { id: "mercadopago", label: "Mercado Pago", icon: Smartphone, color: "border-blue-300 bg-blue-50 text-blue-700" },
]

interface FormaPagoSelectorProps {
  remitoId: string
  initialFormaPago: string | null
  initialCliente: string | null
}

export function FormaPagoSelector({ remitoId, initialFormaPago, initialCliente }: FormaPagoSelectorProps) {
  const [selected, setSelected] = useState<FormaPago>(initialFormaPago as FormaPago ?? null)
  const [loading, setLoading] = useState(false)
  const [editingCliente, setEditingCliente] = useState(false)
  const [clienteVal, setClienteVal] = useState(initialCliente ?? "")
  const [clienteSaved, setClienteSaved] = useState(initialCliente ?? "")
  const [savingCliente, setSavingCliente] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = useCallback(async (valor: FormaPago) => {
    const nuevo = selected === valor ? null : valor
    setSelected(nuevo)
    try {
      setLoading(true)
      const supabase = createClient()
      await supabase.from("remitos").update({ forma_pago: nuevo }).eq("id", remitoId)
    } catch {
      setSelected(selected)
    } finally {
      setLoading(false)
    }
  }, [selected, remitoId])

  const startEditCliente = () => {
    setClienteVal(clienteSaved)
    setEditingCliente(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const cancelCliente = () => {
    setClienteVal(clienteSaved)
    setEditingCliente(false)
  }

  const saveCliente = useCallback(async () => {
    const trimmed = clienteVal.trim()
    if (trimmed === clienteSaved) { setEditingCliente(false); return }
    try {
      setSavingCliente(true)
      const supabase = createClient()
      await supabase.from("remitos").update({ cliente_nombre: trimmed || null }).eq("id", remitoId)
      setClienteSaved(trimmed)
      setEditingCliente(false)
    } catch {
      // revertir
    } finally {
      setSavingCliente(false)
    }
  }, [clienteVal, clienteSaved, remitoId])

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Forma de pago</p>
        {loading && <Loader2 className="size-3.5 animate-spin text-gray-400" />}
      </div>

      <div className="flex gap-2 p-3">
        {OPCIONES.map((op) => {
          const isSelected = selected === op.id
          return (
            <button key={op.id} type="button" onClick={() => handleSelect(op.id)} disabled={loading}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-[13px] font-medium transition-colors active:opacity-70 disabled:opacity-50",
                isSelected ? op.color + " border-current" : "border-gray-200 bg-white text-gray-500"
              )}>
              <op.icon className="size-4" />
              {op.label}
            </button>
          )
        })}
      </div>

      {/* Campo cliente — solo visible cuando es Mercado Pago */}
      {selected === "mercadopago" && (
        <div className="border-t border-gray-100 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">Quién paga</p>
              {editingCliente ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={clienteVal}
                  onChange={(e) => setClienteVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveCliente(); if (e.key === "Escape") cancelCliente() }}
                  placeholder="Nombre del cliente"
                  className="w-full text-[13px] font-semibold text-gray-900 bg-transparent outline-none border-b border-[#1565c0] pb-0.5 placeholder:font-normal placeholder:text-gray-400"
                />
              ) : (
                <p className="text-[13px] font-semibold text-gray-900">
                  {clienteSaved || <span className="text-gray-400 font-normal">Sin nombre</span>}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {editingCliente ? (
                <>
                  <button type="button" onClick={cancelCliente} disabled={savingCliente}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 active:opacity-60">
                    <X className="size-3.5" />
                  </button>
                  <button type="button" onClick={saveCliente} disabled={savingCliente}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1565c0] text-white active:opacity-80 disabled:opacity-40">
                    {savingCliente ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  </button>
                </>
              ) : (
                <button type="button" onClick={startEditCliente}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 active:opacity-60">
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!selected && (
        <p className="px-3 pb-2.5 text-[11px] text-gray-400">Sin registrar</p>
      )}
    </div>
  )
}