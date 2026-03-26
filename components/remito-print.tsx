"use client"

import { forwardRef, useMemo } from "react"
import type { RemitoData } from "@/lib/remito-types"
import { formatCurrency } from "@/lib/remito-types"

interface RemitoPrintProps {
  data: RemitoData
}

const cleanDesc = (value: string) =>
  value
    .replace(/\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()

export const RemitoPrint = forwardRef<HTMLDivElement, RemitoPrintProps>(function RemitoPrint(
  { data },
  ref
) {
  const total = useMemo(
    () => data.items.reduce((sum, item) => sum + item.subtotal, 0),
    [data.items]
  )

  const totalUnidades = useMemo(
    () => data.items.reduce((sum, item) => sum + item.cantidad, 0),
    [data.items]
  )

  const comercio = (data.client.nombre ?? "").trim()

  return (
    <div
      ref={ref}
      id="remito-print"
      className="remito-ticket mx-auto w-[48mm] max-w-[48mm] overflow-hidden bg-white font-mono text-black"
    >
      <div className="px-[2mm] py-[2mm] text-[10px] leading-tight">
        <div className="border-b border-dashed border-black pb-[2mm] text-center">
          <p className="text-[12px] font-bold uppercase">Tapamanía</p>
          <p className="mt-1 text-[10px] font-semibold">Remito / Comprobante</p>
          <p className="mt-1">N° {data.numero}</p>
          <p>{data.fecha}</p>
        </div>

        <div className="border-b border-dashed border-black py-[2mm]">
          <div className="flex justify-between gap-2">
            <span className="font-semibold">Comercio:</span>
            <span className="max-w-[26mm] text-right break-words">
              {comercio || "Sin especificar"}
            </span>
          </div>

          <div className="mt-1 flex justify-between gap-2">
            <span className="font-semibold">Items:</span>
            <span>{data.items.length}</span>
          </div>

          <div className="mt-1 flex justify-between gap-2">
            <span className="font-semibold">Unidades:</span>
            <span>{totalUnidades}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-black py-[2mm]">
          <div className="grid grid-cols-[1fr_auto] gap-2 text-[10px] font-bold">
            <span>Producto</span>
            <span className="text-right">Subtotal</span>
          </div>
        </div>

        <div className="py-[1.5mm]">
          {data.items.length === 0 ? (
            <p className="py-[2mm] text-center">Sin productos</p>
          ) : (
            data.items.map((item, idx) => (
              <div
                key={`${item.product.descripcion}-${item.opcion ?? ""}-${idx}`}
                className="border-b border-dashed border-black py-[2mm] last:border-b-0"
              >
                <p className="break-words font-semibold">
                  {cleanDesc(item.product.descripcion)}
                  {item.opcion ? ` · ${item.opcion}` : ""}
                </p>

                <div className="mt-[1mm] flex justify-between gap-2 text-[10px]">
                  <span>
                    {item.cantidad} x {formatCurrency(item.product.precio)}
                  </span>
                  <span className="text-right font-semibold">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

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