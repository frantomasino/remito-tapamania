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
import { ArrowLeft, Plus, Trash2, FileText, Store, Package2, MessageSquare } from "lucide-react"
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
      <div className="flex flex-col gap-3 px-3 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-6 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-3 pb-5 pt-4">
      <header className="rounded-2xl border bg-card px-4 py-4">
        <div className="flex items-start gap-3">
          <Link
            href={`/dashboard/${remitoId}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Edición
            </p>
            <h1 className="mt-0.5 text-base font-semibold text-foreground">Editar pedido</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Modificá datos, productos y estado.
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <section className="rounded-2xl border bg-card px-4 py-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Pedido
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">Datos principales</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <p className="text-[12px] font-medium text-foreground">Número</p>
              <Input
                id="numero"
                value={form.numero_remito}
                onChange={(e) => setForm({ ...form, numero_remito: e.target.value })}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[12px] font-medium text-foreground">Fecha</p>
              <Input
                id="fecha"
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[12px] font-medium text-foreground">Estado</p>
              <Select
                value={form.estado}
                onValueChange={(v) => setForm({ ...form, estado: v as typeof form.estado })}
              >
                <SelectTrigger id="estado" className="h-10 rounded-xl">
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

        <section className="rounded-2xl border bg-card px-4 py-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
              <Store className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Comercio
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">Opcional</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[12px] font-medium text-foreground">Nombre del comercio</p>
            <Input
              id="cliente"
              value={form.cliente_nombre}
              onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
              className="h-10 rounded-xl"
              placeholder="Ej: Kiosco Juan"
            />
          </div>
        </section>

        <section className="rounded-2xl border bg-card px-4 py-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                <Package2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Items
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {items.length} {items.length === 1 ? "ítem" : "ítems"}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="h-8 rounded-lg px-2.5 text-[12px]"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <div key={index} className="rounded-xl border bg-background px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Item {index + 1}
                  </span>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors active:bg-accent active:text-destructive"
                      aria-label="Eliminar item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Descripción del producto"
                    value={item.descripcion}
                    onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                    className="h-10 rounded-xl"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Cantidad"
                      value={item.cantidad}
                      onChange={(e) => updateItem(index, "cantidad", e.target.value)}
                      className="h-10 rounded-xl"
                    />

                    <Select
                      value={item.unidad}
                      onValueChange={(v) => updateItem(index, "unidad", v)}
                    >
                      <SelectTrigger className="h-10 rounded-xl">
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
          </div>
        </section>

        <section className="rounded-2xl border bg-card px-4 py-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Observaciones
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">Notas adicionales</p>
            </div>
          </div>

          <Textarea
            placeholder="Notas adicionales..."
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            className="min-h-20 resize-none rounded-xl"
          />
        </section>

        {error && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          </div>
        )}

        <Button type="submit" disabled={saving} className="h-10 rounded-xl">
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  )
}