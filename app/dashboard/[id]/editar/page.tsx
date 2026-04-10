"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import type { RemitoWithItems } from "@/lib/remito-types"

interface ItemForm {
  id?: string
  descripcion: string
  cantidad: string
  unidad: string
}

export default function EditarRemitoPage() {
  const params = useParams()
  const router = useRouter()
  const remitoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    numero_remito: "",
    fecha: "",
    cliente_nombre: "",
    estado: "pendiente" as "pendiente" | "entregado" | "cancelado",
    observaciones: "",
  })

  const [items, setItems] = useState<ItemForm[]>([])

  const fetchRemito = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("remitos")
      .select("*, remito_items(*)")
      .eq("id", remitoId)
      .single()

    if (data) {
      const r = data as RemitoWithItems
      setForm({
        numero_remito: r.numero_remito,
        fecha: r.fecha,
        cliente_nombre: r.cliente_nombre || "",
        estado: r.estado,
        observaciones: r.observaciones || "",
      })
      setItems(
        r.remito_items.map((item) => ({
          id: item.id,
          descripcion: item.descripcion,
          cantidad: String(item.cantidad),
          unidad: item.unidad,
        }))
      )
    }
    setLoading(false)
  }, [remitoId])

  useEffect(() => { fetchRemito() }, [fetchRemito])

  function addItem() {
    setItems((prev) => [...prev, { descripcion: "", cantidad: "1", unidad: "unidad" }])
  }

  function removeItem(index: number) {
    if (items.length === 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof ItemForm, value: string) {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!form.numero_remito.trim()) {
      setError("El número de pedido es obligatorio")
      setSaving(false)
      return
    }

    if (items.some((item) => !item.descripcion.trim())) {
      setError("Todos los items deben tener una descripción")
      setSaving(false)
      return
    }

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from("remitos")
      .update({
        numero_remito: form.numero_remito,
        fecha: form.fecha,
        cliente_nombre: form.cliente_nombre || null,
        estado: form.estado,
        observaciones: form.observaciones || null,
      })
      .eq("id", remitoId)

    if (updateError) { setError("Error al actualizar el pedido."); setSaving(false); return }

    await supabase.from("remito_items").delete().eq("remito_id", remitoId)

    const { error: itemsError } = await supabase.from("remito_items").insert(
      items.map((item) => ({
        remito_id: remitoId,
        descripcion: item.descripcion,
        cantidad: parseFloat(item.cantidad) || 1,
        unidad: item.unidad,
      }))
    )

    if (itemsError) { setError("Error al actualizar los items."); setSaving(false); return }

    router.push(`/dashboard/${remitoId}`)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <Skeleton className="h-8 w-32 rounded-xl bg-[#1a1a1c]" />
        <Skeleton className="h-32 rounded-xl bg-[#1a1a1c]" />
        <Skeleton className="h-48 rounded-xl bg-[#1a1a1c]" />
      </div>
    )
  }

  const inputClass = "h-11 w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-white/20"
  const labelClass = "text-[12px] font-medium text-[#888]"
  const fieldClass = "flex flex-col gap-1.5"
  const sectionClass = "rounded-xl border border-white/8 bg-[#161616] overflow-hidden"
  const sectionHeaderClass = "flex items-center justify-between px-3 py-2.5 border-b border-white/8"
  const sectionTitleClass = "text-[11px] font-semibold uppercase tracking-wide text-[#444]"

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-3 text-white">

      {/* ── HEADER ── */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/dashboard/${remitoId}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#1a1a1c] text-[#666] active:opacity-60"
          aria-label="Volver"
        >
          <ArrowLeft className="size-3.5" />
        </Link>
        <div>
          <h1 className="text-[18px] font-semibold text-white">Editar pedido</h1>
          <p className="text-[11px] text-[#555]">{form.numero_remito || "Sin número"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        {/* ── DATOS DEL PEDIDO ── */}
        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <p className={sectionTitleClass}>Datos del pedido</p>
          </div>
          <div className="flex flex-col gap-3 p-3">
            <div className={fieldClass}>
              <label className={labelClass}>Número</label>
              <input
                value={form.numero_remito}
                onChange={(e) => setForm({ ...form, numero_remito: e.target.value })}
                required
                className={inputClass}
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as typeof form.estado })}
                className={inputClass + " appearance-none"}
              >
                <option value="pendiente">Pendiente</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── PRODUCTOS ── */}
        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <p className={sectionTitleClass}>
              Productos · {items.length} {items.length === 1 ? "ítem" : "ítems"}
            </p>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-[12px] text-[#5aa9ff] active:opacity-60"
            >
              <Plus className="size-3" />
              Agregar
            </button>
          </div>
          <div className="flex flex-col divide-y divide-white/8">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col gap-2.5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-[#555]">Producto {index + 1}</p>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-[#ff5555] active:opacity-60"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Descripción</label>
                  <input
                    placeholder="Descripción del producto"
                    value={item.descripcion}
                    onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={fieldClass}>
                    <label className={labelClass}>Cantidad</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.cantidad}
                      onChange={(e) => updateItem(index, "cantidad", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className={fieldClass}>
                    <label className={labelClass}>Unidad</label>
                    <select
                      value={item.unidad}
                      onChange={(e) => updateItem(index, "unidad", e.target.value)}
                      className={inputClass + " appearance-none"}
                    >
                      <option value="unidad">Unidad</option>
                      <option value="kg">Kg</option>
                      <option value="litro">Litro</option>
                      <option value="metro">Metro</option>
                      <option value="caja">Caja</option>
                      <option value="bulto">Bulto</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CLIENTE ── */}
        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <p className={sectionTitleClass}>Cliente</p>
          </div>
          <div className="p-3">
            <div className={fieldClass}>
              <label className={labelClass}>Nombre (opcional)</label>
              <input
                value={form.cliente_nombre}
                onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
                placeholder="Ej: Kiosco Juan"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* ── OBSERVACIONES ── */}
        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <p className={sectionTitleClass}>Observaciones</p>
          </div>
          <div className="p-3">
            <textarea
              placeholder="Notas adicionales..."
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              className="min-h-[80px] w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 py-2.5 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-white/20 resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-300" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="h-11 w-full rounded-xl bg-[#1976d2] text-[14px] font-semibold text-white active:opacity-80 disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>

      </form>
    </div>
  )
}