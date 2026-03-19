"use client"

import { forwardRef } from "react"
import type { RemitoData } from "@/lib/remito-types"
import { formatCurrency } from "@/lib/remito-types"

interface RemitoPrintProps {
  data: RemitoData
}

export const RemitoPrint = forwardRef<HTMLDivElement, RemitoPrintProps>(function RemitoPrint(
  { data },
  ref
) {
  const total = data.items.reduce((s, i) => s + i.subtotal, 0)
  const comercio = (data.client.nombre ?? "").trim()

  return (
    <div
      ref={ref}
      id="remito-print"
      className="w-full overflow-x-hidden bg-white text-black"
    >
      <div className="mx-auto w-full max-w-full p-4 font-sans text-[12px] leading-relaxed sm:max-w-[800px] sm:p-6 sm:text-[13px]">
        {/* Encabezado */}
        <div className="border-2 border-black">
          <div className="flex items-center justify-between gap-4 border-b-2 border-black px-4 py-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight sm:text-2xl">PEDIDO</h1>
              <p className="text-[11px] sm:text-[12px]">Preventa</p>
            </div>

            <div className="text-right">
              <p className="text-[12px] font-bold sm:text-sm">N° {data.numero}</p>
              <p className="text-[12px] font-semibold sm:text-sm">Fecha: {data.fecha}</p>
            </div>
          </div>

          <div className="px-4 py-3 text-[11px] sm:text-[12px]">
            <div className="min-w-0">
              <span className="font-semibold">Comercio: </span>
              <span>{comercio || "Sin especificar"}</span>
            </div>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="border-x-2 border-b-2 border-black">
          <table className="w-full table-fixed text-[11px] sm:text-[12px]">
            <thead>
              <tr className="border-b-2 border-black bg-black/5">
                <th className="border-r border-black px-2 py-2 text-left font-semibold">
                  Producto
                </th>
                <th className="border-r border-black px-2 py-2 text-center font-semibold w-14 sm:w-16">
                  Cant.
                </th>
                <th className="border-r border-black px-2 py-2 text-right font-semibold w-24 sm:w-28">
                  P. unit.
                </th>
                <th className="px-2 py-2 text-right font-semibold w-24 sm:w-28">
                  Subtotal
                </th>
              </tr>
            </thead>

            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                    Sin productos
                  </td>
                </tr>
              ) : (
                data.items.map((item, idx) => (
                  <tr key={`${item.product.descripcion}-${item.opcion ?? ""}-${idx}`} className="border-b border-black/20">
                    <td className="border-r border-black/20 px-2 py-2 align-top whitespace-normal break-words">
                      {item.product.descripcion.replace(/\([^)]*\)/g, "").trim()}
                      {item.opcion ? ` — ${item.opcion}` : ""}
                    </td>
                    <td className="border-r border-black/20 px-2 py-2 text-center align-top">
                      {item.cantidad}
                    </td>
                    <td className="border-r border-black/20 px-2 py-2 text-right align-top tabular-nums">
                      {formatCurrency(item.product.precio)}
                    </td>
                    <td className="px-2 py-2 text-right align-top font-medium tabular-nums">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="border-x-2 border-b-2 border-black">
          <div className="flex justify-end px-4 py-3">
            <div className="w-full max-w-[320px]">
              <div className="flex items-center justify-between gap-4 text-[12px] sm:text-sm">
                <span className="font-semibold">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-4 border-t border-black pt-2 text-[14px] font-bold sm:text-base">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})