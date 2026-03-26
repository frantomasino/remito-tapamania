"use client"

import Link from "next/link"
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react"
import { useMemo, useState } from "react"
import { type SaleRecord, formatCurrency } from "@/lib/remito-types"

interface SalesHistoryProps {
  records: SaleRecord[]
  title?: string
  defaultExpanded?: boolean
}

export function SalesHistory({
  records,
  title = "Pedidos",
  defaultExpanded = true,
}: SalesHistoryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const total = useMemo(() => records.reduce((s, r) => s + (r.total || 0), 0), [records])

  if (records.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#1b1b1d] px-4 py-8 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#232326] text-[#9e9ea6] ring-1 ring-white/10">
            <ClipboardList className="size-5" />
          </div>

          <h2 className="mt-3 text-base font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-1 max-w-[240px] text-sm leading-relaxed text-[#9e9ea6]">
            Todavía no hay pedidos para mostrar hoy.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1b1d] shadow-[0_1px_0_rgba(255,255,255,0.03)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
        aria-expanded={expanded}
        aria-controls="sales-history-content"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#1976d2] text-white">
            <ClipboardList className="size-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold tracking-tight text-white">
                {title}
              </h2>
              <span className="rounded-full border border-white/10 bg-[#232326] px-2.5 py-1 text-[11px] font-medium text-[#b0b0b6]">
                {records.length}
              </span>
            </div>

            <p className="mt-1 text-sm text-[#9e9ea6]">
              Total del día {formatCurrency(total)}
            </p>
          </div>
        </div>

        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#232326] ring-1 ring-white/10">
          {expanded ? (
            <ChevronUp className="size-4 text-[#b0b0b6]" />
          ) : (
            <ChevronDown className="size-4 text-[#b0b0b6]" />
          )}
        </div>
      </button>

      {expanded && (
        <div id="sales-history-content" className="border-t border-white/10 px-4 py-2">
          <div className="divide-y divide-white/10">
            {records.map((record) => (
              <Link
                key={record.id}
                href={`/dashboard/${record.id}`}
                className="block rounded-2xl py-3 transition-colors active:bg-white/5"
              >
                <article className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-white">
                      {record.numero}
                    </p>

                    <p className="mt-1 truncate text-sm text-white">
                      {record.cliente || "Sin cliente"}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9e9ea6]">
                      <span>{record.fecha}</span>

                      {(record.itemCount ?? 0) > 0 ? (
                        <>
                          <span>•</span>
                          <span>
                            {record.itemCount} {(record.itemCount ?? 0) === 1 ? "item" : "items"}
                          </span>
                        </>
                      ) : null}

                      {record.formaPago ? (
                        <>
                          <span>•</span>
                          <span>{record.formaPago}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-white tabular-nums">
                      {formatCurrency(record.total ?? 0)}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-[#b0b0b6]">Ver detalle</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}