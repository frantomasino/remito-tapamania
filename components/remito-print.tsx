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
  const MAX_ROWS = 12

  const total = data.items.reduce((s, i) => s + i.subtotal, 0)
  const rows = data.items.slice(0, MAX_ROWS)
  const emptyCount = Math.max(0, MAX_ROWS - rows.length)

  return (
    <div
      ref={ref}
      className="remito-print bg-card text-card-foreground w-full overflow-x-hidden"
      id="remito-print"
    >
      <div className="mx-auto w-full max-w-full sm:max-w-[800px] p-3 sm:p-6 font-sans text-[11px] sm:text-[13px] leading-relaxed overflow-x-hidden">
        {/* Header */}
        <div className="flex items-stretch border-2 border-foreground w-full">
          {/* Left - Title */}
          <div className="flex flex-1 items-center justify-center border-r-2 border-foreground p-3 sm:p-4 min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground">COMPROBANTE</h1>
          </div>

          {/* Center - X mark */}
          <div className="flex items-center justify-center border-r-2 border-foreground px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <div className="flex size-10 sm:size-12 items-center justify-center rounded border-2 border-foreground text-xl sm:text-2xl font-bold text-foreground">
              X
            </div>
          </div>

          {/* Right - Number & Date */}
          <div className="flex flex-1 flex-col justify-center p-3 sm:p-4 min-w-0">
            <p className="text-[12px] sm:text-sm font-bold text-foreground truncate">
              {"N\u00BA"} {data.numero}
            </p>
            <p className="text-[12px] sm:text-sm font-semibold text-foreground truncate">
              FECHA: {data.fecha}
            </p>
          </div>
        </div>

        {/* Client Info */}
        <div className="border-x-2 border-b-2 border-foreground w-full overflow-x-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 p-3 text-[11px] sm:text-[12px]">
            <div className="min-w-0">
              <span className="font-semibold text-foreground">NOMBRE: </span>
              <span className="text-foreground break-words">{data.client.nombre}</span>
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-foreground">TELEFONO: </span>
              <span className="text-foreground break-words">{data.client.telefono}</span>
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-foreground">DIRECCION: </span>
              <span className="text-foreground break-words">{data.client.direccion}</span>
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-foreground">MAIL: </span>
              <span className="text-foreground break-words">{data.client.mail}</span>
            </div>

            {data.client.formaPago ? (
              <div className="sm:col-span-2 min-w-0">
                <span className="font-semibold text-foreground">FORMA DE PAGO: </span>
                <span className="text-foreground break-words">{data.client.formaPago}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Items Table */}
        <div className="border-x-2 border-b-2 border-foreground w-full overflow-x-hidden">
          <table className="w-full text-[11px] sm:text-[12px] table-fixed">
            <thead>
              <tr className="border-b-2 border-foreground bg-muted/30">
                <th className="border-r border-foreground px-2 sm:px-3 py-2 text-left font-semibold text-foreground">
                  Descripcion
                </th>
                <th className="border-r border-foreground px-2 sm:px-3 py-2 text-center font-semibold text-foreground w-14 sm:w-16">
                  Cant.
                </th>
                <th className="border-r border-foreground px-2 sm:px-3 py-2 text-right font-semibold text-foreground w-24 sm:w-28">
                  Precio Uni.
                </th>
                <th className="px-2 sm:px-3 py-2 text-right font-semibold text-foreground w-24 sm:w-28">
                  Sub Total
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item, idx) => (
                <tr key={idx} className="h-8 border-b border-foreground/30">
                  <td className="border-r border-foreground/30 px-2 sm:px-3 py-1.5 text-foreground whitespace-normal break-words">
                    {item.product.descripcion.replace(/\([^)]*\)/g, "").trim()}
{item.opcion ? ` — ${item.opcion}` : ""}
                  </td>
                  <td className="border-r border-foreground/30 px-2 sm:px-3 py-1.5 text-center text-foreground">
                    {item.cantidad}
                  </td>
                  <td className="border-r border-foreground/30 px-2 sm:px-3 py-1.5 text-right text-foreground tabular-nums">
                    {formatCurrency(item.product.precio)}
                  </td>
                  <td className="px-2 sm:px-3 py-1.5 text-right font-medium text-foreground tabular-nums">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}

              {Array.from({ length: emptyCount }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-8 border-b border-foreground/10">
                  <td className="border-r border-foreground/10 px-2 sm:px-3 py-1.5">&nbsp;</td>
                  <td className="border-r border-foreground/10 px-2 sm:px-3 py-1.5">&nbsp;</td>
                  <td className="border-r border-foreground/10 px-2 sm:px-3 py-1.5">&nbsp;</td>
                  <td className="px-2 sm:px-3 py-1.5">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-x-2 border-b-2 border-foreground w-full overflow-x-hidden">
          <div className="flex justify-end p-3">
            <div className="flex flex-col items-end gap-1 text-[12px] sm:text-sm w-full max-w-[320px]">
              <div className="flex items-center justify-between gap-4 w-full">
                <span className="font-semibold text-foreground">SUBTOTAL:</span>
                <span className="text-foreground text-right tabular-nums">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 w-full text-[13px] sm:text-base font-bold border-t border-foreground pt-1">
                <span className="text-foreground">TOTAL:</span>
                <span className="text-foreground text-right tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 text-center text-[10px] text-muted-foreground">
          <p>Generado por Sistema de Remitos</p>
        </div>
      </div>
    </div>
  )
})