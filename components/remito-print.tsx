"use client"

import { forwardRef, useMemo } from "react"
import type { RemitoData, LineItem } from "@/lib/remito-types"
import { formatCurrency } from "@/lib/remito-types"

interface RemitoPrintProps {
  data: RemitoData
  empresa?: string
}

const cleanDesc = (value: string) =>
  value.replace(/\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim()

type PrintGroup = {
  title: string
  precio: number
  totalCantidad: number
  totalSubtotal: number
  totalDevolucion: number
  opciones: Array<{ opcion: string; cantidad: number; devolucion: number }>
  hasOpciones: boolean
}

function groupItems(items: LineItem[]): PrintGroup[] {
  const groups = new Map<string, PrintGroup>()
  for (const item of items) {
    const baseDesc = item.product.descripcion
    const title = cleanDesc(baseDesc)
    if (groups.has(baseDesc)) {
      const g = groups.get(baseDesc)!
      g.totalCantidad += item.cantidad
      g.totalSubtotal += item.subtotal
      g.totalDevolucion += item.devolucion ?? 0
      if (item.opcion) {
        g.opciones.push({ opcion: item.opcion, cantidad: item.cantidad, devolucion: item.devolucion ?? 0 })
        g.hasOpciones = true
      }
    } else {
      groups.set(baseDesc, {
        title,
        precio: item.product.precio,
        totalCantidad: item.cantidad,
        totalSubtotal: item.subtotal,
        totalDevolucion: item.devolucion ?? 0,
        opciones: item.opcion ? [{ opcion: item.opcion, cantidad: item.cantidad, devolucion: item.devolucion ?? 0 }] : [],
        hasOpciones: !!item.opcion,
      })
    }
  }
  return Array.from(groups.values())
}

export const RemitoPrint = forwardRef<HTMLDivElement, RemitoPrintProps>(function RemitoPrint(
  { data, empresa = "Remito" },
  ref
) {
  const total = useMemo(() => data.items.reduce((sum, item) => sum + item.subtotal, 0), [data.items])
  const totalUnidades = useMemo(() => data.items.reduce((sum, item) => sum + item.cantidad, 0), [data.items])
  const totalDevolucion = useMemo(() => data.items.reduce((sum, item) => sum + (item.devolucion ?? 0), 0), [data.items])
  const comercio = (data.client.nombre ?? "").trim()
  const grouped = useMemo(() => groupItems(data.items), [data.items])

  return (
    <div
      ref={ref}
      id="remito-print"
      className="remito-ticket mx-auto w-[48mm] max-w-[48mm] overflow-hidden bg-white font-mono text-black"
    >
      <div className="px-[2mm] py-[2mm] text-[10px] leading-tight">
        {/* Header */}
        <div className="border-b border-dashed border-black pb-[2mm] text-center">
          <p className="text-[12px] font-bold uppercase">{empresa}</p>
          <p className="mt-1 text-[10px] font-semibold">Remito - Pedido</p>
          <p className="mt-1">N° {data.numero}</p>
          <p>{data.fecha}</p>
        </div>

        {/* Info */}
        <div className="border-b border-dashed border-black py-[2mm]">
          <div className="flex justify-between gap-2">
            <span className="font-semibold">Comercio:</span>
            <span className="max-w-[26mm] text-right break-words">{comercio || "Sin especificar"}</span>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <span className="font-semibold">Items:</span>
            <span>{grouped.length}</span>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <span className="font-semibold">Unidades:</span>
            <span>{totalUnidades}</span>
          </div>
          {totalDevolucion > 0 && (
            <div className="mt-1 flex justify-between gap-2">
              <span className="font-semibold">Devoluciones:</span>
              <span>{totalDevolucion}</span>
            </div>
          )}
        </div>

        {/* Columnas */}
        <div className="border-b border-dashed border-black py-[2mm]">
          <div className="grid grid-cols-[1fr_auto] gap-2 text-[10px] font-bold">
            <span>Producto</span>
            <span className="text-right">Subtotal</span>
          </div>
        </div>

        {/* Items */}
        <div className="py-[1.5mm]">
          {grouped.length === 0 ? (
            <p className="py-[2mm] text-center">Sin productos</p>
          ) : (
            grouped.map((group, idx) => (
              <div key={`${group.title}-${idx}`} className="border-b border-dashed border-black py-[2mm] last:border-b-0">
                {/* Nombre + total */}
                <p className="break-words font-semibold">
                  {group.title}
                  <span className="font-normal"> x{group.totalCantidad}</span>
                </p>

                {/* Desglose opciones venta */}
                {group.hasOpciones && group.opciones.length > 0 && (
                  <p className="mt-[0.5mm] text-[9px] text-gray-600 break-words">
                    {group.opciones.filter(o => o.cantidad > 0).map((o) => `${o.opcion} ${o.cantidad}`).join(", ")}
                  </p>
                )}

                {/* Devoluciones */}
                {group.totalDevolucion > 0 && (
                  <p className="mt-[0.5mm] text-[9px] break-words">
                    {"Dev: "}
                    {group.hasOpciones
                      ? group.opciones.filter(o => o.devolucion > 0).map((o) => `${o.devolucion} ${o.opcion}`).join(", ")
                      : group.totalDevolucion
                    }
                  </p>
                )}

                {/* Precio × cantidad → subtotal */}
                <div className="mt-[1mm] flex justify-between gap-2 text-[10px]">
                  <span>{group.totalCantidad} x {formatCurrency(group.precio)}</span>
                  <span className="text-right font-semibold">{formatCurrency(group.totalSubtotal)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales */}
        <div className="border-t border-dashed border-black pt-[2mm]">
          <div className="flex justify-between text-[10px]">
            <span>Subtotal</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="mt-[1mm] flex justify-between text-[12px] font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(total)}</span>
          </div>
          
        </div>

        <div className="pt-[3mm] text-center text-[9px]">
          <p>Gracias</p>
        </div>
      </div>
    </div>
  )
})