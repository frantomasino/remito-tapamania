"use client"

import { forwardRef } from "react"
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
  const total = data.items.reduce((sum, item) => sum + item.subtotal, 0)
  const comercio = (data.client.nombre ?? "").trim()

  return (
    <div ref={ref} id="remito-print" className="w-full overflow-x-hidden bg-white text-black">
      <div className="mx-auto w-full max-w-full font-sans">
        <div className="border border-black">
          <div className="border-b border-black px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/70">
                  Pedido
                </p>
                <h1 className="mt-0.5 text-[20px] font-bold leading-none">Preventa</h1>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[12px] font-semibold">N° {data.numero}</p>
                <p className="mt-1 text-[11px] text-black/75">Fecha: {data.fecha}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-black px-4 py-3">
            <div className="grid grid-cols-[84px_1fr] gap-x-3 gap-y-1 text-[11px] sm:grid-cols-[96px_1fr] sm:text-[12px]">
              <span className="font-semibold">Comercio</span>
              <span className="break-words">{comercio || "Sin especificar"}</span>
            </div>
          </div>

          <table className="w-full table-fixed text-[11px] sm:text-[12px]">
            <thead>
              <tr className="border-b border-black bg-black/[0.03]">
                <th className="border-r border-black px-2 py-2 text-left font-semibold">Producto</th>
                <th className="w-12 border-r border-black px-2 py-2 text-center font-semibold sm:w-14">
                  Cant.
                </th>
                <th className="w-20 border-r border-black px-2 py-2 text-right font-semibold sm:w-24">
                  P. unit.
                </th>
                <th className="w-20 px-2 py-2 text-right font-semibold sm:w-24">Subtotal</th>
              </tr>
            </thead>

            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-5 text-center text-[11px] text-black/60">
                    Sin productos
                  </td>
                </tr>
              ) : (
                data.items.map((item, idx) => (
                  <tr
                    key={`${item.product.descripcion}-${item.opcion ?? ""}-${idx}`}
                    className="border-b border-black/20 last:border-b-0"
                  >
                    <td className="border-r border-black/20 px-2 py-2 align-top break-words">
                      <div className="leading-snug">
                        <span>{cleanDesc(item.product.descripcion)}</span>
                        {item.opcion ? <span className="text-black/65"> — {item.opcion}</span> : null}
                      </div>
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

          <div className="border-t border-black px-4 py-3">
            <div className="ml-auto w-full max-w-[240px] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] sm:text-[12px]">
                <span className="text-black/75">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-black pt-2 text-[14px] font-bold sm:text-[15px]">
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