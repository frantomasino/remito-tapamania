"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Store,
  Package2,
  MessageSquare,
  ReceiptText,
} from "lucide-react"
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

  useEffect(() => {
    fetchRemito()
  }, [fetchRemito])

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

    const hasEmptyItem = items.some((item) => !item.descripcion.trim())
    if (hasEmptyItem) {
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

    if (updateError) {
      setError("Error al actualizar el pedido.")
      setSaving(false)
      return
    }

    await supabase.from("remito_items").delete().eq("remito_id", remitoId)

    const remitoItems = items.map((item) => ({
      remito_id: remitoId,
      descripcion: item.descripcion,
      cantidad: parseFloat(item.cantidad) || 1,
      unidad: item.unidad,
    }))

    const { error: itemsError } = await supabase.from("remito_items").insert(remitoItems)

    if (itemsError) {
      setError("Error al actualizar los items.")
      setSaving(false)
      return
    }

    router.push(`/dashboard/${remitoId}`)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl bg-[#232326]" />
          <Skeleton className="h-6 w-40 rounded-2xl bg-[#232326]" />
        </div>
        <Skeleton className="h-36 rounded-3xl bg-[#232326]" />
        <Skeleton className="h-64 rounded-3xl bg-[#232326]" />
        <Skeleton className="h-28 rounded-3xl bg-[#232326]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-5 pt-4 text-white">
      <header className="rounded-[28px] border border-white/10 bg-[#2a2926] px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-start gap-3">
          <Link
            href={`/dashboard/${remitoId}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
            aria-label="Volver al detalle"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#1976d2] text-white">
                <ReceiptText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b0b0b6]">
                  Editar pedido
                </p>
                <h1 className="mt-1 text-base font-semibold tracking-tight text-white">
                  {form.numero_remito || "Sin número"}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <section className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#232326] ring-1 ring-white/10">
              <FileText className="h-4 w-4 text-[#9e9ea6]" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white">
                Datos del pedido
              </h2>
              <p className="mt-1 text-sm text-[#9e9ea6]">
                Número, fecha y estado actual.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-white">Número</p>
              <Input
                id="numero"
                value={form.numero_remito}
                onChange={(e) => setForm({ ...form, numero_remito: e.target.value })}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-white">Fecha</p>
              <Input
                id="fecha"
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-white">Estado</p>
              <Select
                value={form.estado}
                onValueChange={(v) => setForm({ ...form, estado: v as typeof form.estado })}
              >
                <SelectTrigger className="border-white/10 bg-[#1a1a1c] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1b1b1d] text-white">
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#232326] ring-1 ring-white/10">
                <Package2 className="h-4 w-4 text-[#9e9ea6]" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-white">Productos</h2>
                <p className="mt-1 text-sm text-[#9e9ea6]">
                  {items.length} {items.length === 1 ? "producto" : "productos"}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="border-white/10 bg-transparent text-white hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-[#232326] px-3 py-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">Producto {index + 1}</p>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-[#b0b0b6] transition-colors hover:bg-white/5 hover:text-[#ff6b6b]"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-white">Descripción</p>
                    <Input
                      placeholder="Descripción del producto"
                      value={item.descripcion}
                      onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-white">Cantidad</p>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Cantidad"
                        value={item.cantidad}
                        onChange={(e) => updateItem(index, "cantidad", e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-white">Unidad</p>
                      <Select
                        value={item.unidad}
                        onValueChange={(v) => updateItem(index, "unidad", v)}
                      >
                        <SelectTrigger className="border-white/10 bg-[#1a1a1c] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#1b1b1d] text-white">
                          <SelectItem value="unidad">Unidad</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="litro">Litro</SelectItem>
                          <SelectItem value="metro">Metro</SelectItem>
                          <SelectItem value="caja">Caja</SelectItem>
                          <SelectItem value="bulto">Bulto</SelectItem>
                          <SelectItem value="pack">Pack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#232326] ring-1 ring-white/10">
              <Store className="h-4 w-4 text-[#9e9ea6]" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white">
                Cliente o comercio
              </h2>
              <p className="mt-1 text-sm text-[#9e9ea6]">
                Opcional. Solo si querés dejarlo cargado.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-white">Nombre</p>
            <Input
              id="cliente"
              value={form.cliente_nombre}
              onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
              className="h-11 rounded-xl"
              placeholder="Ej: Kiosco Juan"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1b1b1d] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#232326] ring-1 ring-white/10">
              <MessageSquare className="h-4 w-4 text-[#9e9ea6]" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white">
                Observaciones
              </h2>
              <p className="mt-1 text-sm text-[#9e9ea6]">Notas adicionales del pedido.</p>
            </div>
          </div>

          <Textarea
            placeholder="Notas adicionales..."
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            className="min-h-24 rounded-2xl border-white/10 bg-[#1a1a1c] text-white placeholder:text-[#8f8f95]"
          />
        </section>

        {error && (
          <div
            className="rounded-2xl border border-[#ff5a5f]/20 bg-[#ff5a5f]/10 px-3 py-2.5 text-sm text-white"
            role="alert"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={saving}
          size="lg"
          className="h-12 rounded-2xl bg-[#1976d2] text-white hover:bg-[#1c82e4]"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  )
}