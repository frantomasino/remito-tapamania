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
      <section className="app-empty bg-card ring-1 ring-border">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ClipboardList className="size-5" />
          </div>

          <h2 className="mt-3 app-section-title">{title}</h2>
          <p className="mt-1 max-w-[240px] text-sm leading-relaxed text-muted-foreground">
            Todavía no hay pedidos para mostrar hoy.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="app-card p-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
        aria-expanded={expanded}
        aria-controls="sales-history-content"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ClipboardList className="size-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate app-section-title">{title}</h2>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {records.length}
              </span>
            </div>

            <p className="app-subtitle mt-1">Total del día {formatCurrency(total)}</p>
          </div>
        </div>

        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div id="sales-history-content" className="border-t border-border/60 px-4 py-2">
          <div className="divide-y divide-border/60">
            {records.map((record) => (
              <Link
                key={record.id}
                href={`/dashboard/${record.id}`}
                className="block rounded-2xl py-3 transition-colors active:bg-accent/60"
              >
                <article className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {record.numero}
                    </p>

                    <p className="mt-1 truncate text-sm text-foreground">
                      {record.cliente || "Sin cliente"}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                    <p className="text-base font-semibold text-foreground tabular-nums">
                      {formatCurrency(record.total ?? 0)}
                    </p>
                    <p className="app-meta mt-1">Ver detalle</p>
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