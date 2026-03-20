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
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <Skeleton className="h-6 w-40 rounded-2xl" />
        </div>
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-5 pt-4">
      <header className="app-card">
        <div className="flex items-start gap-3">
          <Link
            href={`/dashboard/${remitoId}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background ring-1 ring-border"
            aria-label="Volver al detalle"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ReceiptText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="app-section-title">Editar pedido</h1>
                <p className="app-subtitle mt-1">Pedido {form.numero_remito || "sin número"}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <section className="app-card">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background ring-1 ring-border">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="app-section-title">Datos del pedido</h2>
              <p className="app-subtitle mt-1">Número, fecha y estado actual.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <p className="app-field-label">Número</p>
              <Input
                id="numero"
                value={form.numero_remito}
                onChange={(e) => setForm({ ...form, numero_remito: e.target.value })}
                required
                className="app-input"
              />
            </div>

            <div className="space-y-1.5">
              <p className="app-field-label">Fecha</p>
              <Input
                id="fecha"
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="app-input"
              />
            </div>

            <div className="space-y-1.5">
              <p className="app-field-label">Estado</p>
              <Select
                value={form.estado}
                onValueChange={(v) => setForm({ ...form, estado: v as typeof form.estado })}
              >
                <SelectTrigger id="estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="app-card">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background ring-1 ring-border">
                <Package2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h2 className="app-section-title">Productos</h2>
                <p className="app-subtitle mt-1">
                  {items.length} {items.length === 1 ? "producto" : "productos"}
                </p>
              </div>
            </div>

            <Button type="button" variant="outline" size="default" onClick={addItem}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <div key={index} className="app-card-soft px-3 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Producto {index + 1}</p>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-muted-foreground transition-colors active:bg-accent active:text-destructive"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1.5">
                    <p className="app-field-label">Descripción</p>
                    <Input
                      placeholder="Descripción del producto"
                      value={item.descripcion}
                      onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                      className="app-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <p className="app-field-label">Cantidad</p>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Cantidad"
                        value={item.cantidad}
                        onChange={(e) => updateItem(index, "cantidad", e.target.value)}
                        className="app-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="app-field-label">Unidad</p>
                      <Select
                        value={item.unidad}
                        onValueChange={(v) => updateItem(index, "unidad", v)}
                      >
                        <SelectTrigger>
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
              </div>
            ))}
          </div>
        </section>

        <section className="app-card">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background ring-1 ring-border">
              <Store className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="app-section-title">Cliente o comercio</h2>
              <p className="app-subtitle mt-1">Opcional. Solo si querés dejarlo cargado.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="app-field-label">Nombre</p>
            <Input
              id="cliente"
              value={form.cliente_nombre}
              onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
              className="app-input"
              placeholder="Ej: Kiosco Juan"
            />
          </div>
        </section>

        <section className="app-card">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background ring-1 ring-border">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="app-section-title">Observaciones</h2>
              <p className="app-subtitle mt-1">Notas adicionales del pedido.</p>
            </div>
          </div>

          <Textarea
            placeholder="Notas adicionales..."
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            className="app-textarea"
          />
        </section>

        {error && (
          <div className="app-feedback-error">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          </div>
        )}

        <Button type="submit" disabled={saving} size="lg">
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  )
}