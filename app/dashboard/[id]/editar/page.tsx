"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import type { RemitoWithItems } from "@/lib/remitos"

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
    setItems([...items, { descripcion: "", cantidad: "1", unidad: "unidad" }])
  }

  function removeItem(index: number) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof ItemForm, value: string) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!form.numero_remito) {
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
      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <header className="flex items-center gap-3">
        <Link
          href={`/dashboard/${remitoId}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors active:bg-accent"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Editar pedido</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Datos del pedido
          </h2>

          <div className="flex flex-col gap-2">
            <Label htmlFor="numero">Número *</Label>
            <Input
              id="numero"
              value={form.numero_remito}
              onChange={(e) => setForm({ ...form, numero_remito: e.target.value })}
              required
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={form.estado}
              onValueChange={(v) => setForm({ ...form, estado: v as typeof form.estado })}
            >
              <SelectTrigger id="estado" className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Comercio
          </h2>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cliente">Comercio (opcional)</Label>
            <Input
              id="cliente"
              value={form.cliente_nombre}
              onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
              className="h-11 rounded-xl"
              placeholder="Ej: Kiosco Juan"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Items
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addItem}
              className="h-8 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-lg border border-border/50 bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Item {index + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-muted-foreground transition-colors active:text-destructive"
                    aria-label="Eliminar item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Input
                placeholder="Descripción del producto"
                value={item.descripcion}
                onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                className="h-10 rounded-lg"
              />

              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Cant."
                    value={item.cantidad}
                    onChange={(e) => updateItem(index, "cantidad", e.target.value)}
                    className="h-10 rounded-lg"
                  />
                </div>

                <div className="flex-1">
                  <Select value={item.unidad} onValueChange={(v) => updateItem(index, "unidad", v)}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
          ))}
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Observaciones
          </h2>
          <Textarea
            placeholder="Notas adicionales..."
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            className="min-h-20 resize-none rounded-xl"
          />
        </section>

        {error && (
          <p className="text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={saving} className="h-12 rounded-xl text-base font-semibold">
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  )
}