"use client"

import { Trash2, ClipboardList, ChevronDown, ChevronUp, ReceiptText } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type SaleRecord, formatCurrency } from "@/lib/remito-types"

interface SalesHistoryProps {
  records: SaleRecord[]
  onClear?: () => void
  title?: string
  defaultExpanded?: boolean
}

export function SalesHistory({
  records,
  onClear,
  title = "Pedidos",
  defaultExpanded = true,
}: SalesHistoryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const total = useMemo(() => records.reduce((s, r) => s + (r.total || 0), 0), [records])

  if (records.length === 0) {
    return (
      <section className="rounded-3xl border bg-card px-4 py-5 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="size-5" />
          </div>

          <h2 className="mt-3 text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 max-w-[240px] text-[13px] leading-relaxed text-muted-foreground">
            Todavía no hay pedidos para mostrar hoy.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border bg-card px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-3 bg-transparent p-0 text-left"
          aria-expanded={expanded}
          aria-controls="sales-history-content"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
              <span className="rounded-full border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                {records.length}
              </span>
            </div>

            <p className="mt-1 text-[13px] text-muted-foreground">
              Total del día {formatCurrency(total)}
            </p>
          </div>

          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border bg-background">
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {onClear ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="h-9 rounded-xl px-3 text-[12px]"
          >
            <Trash2 className="size-4" />
            Limpiar
          </Button>
        ) : null}
      </div>

      {expanded && (
        <div id="sales-history-content" className="mt-4 flex flex-col gap-3">
          {records.map((record) => (
            <article
              key={record.id}
              className="rounded-2xl border bg-background px-4 py-4 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
                  <ReceiptText className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-semibold text-foreground">
                        {record.numero}
                      </p>
                      <p className="mt-1 truncate text-[13px] text-muted-foreground">
                        {record.cliente || "Sin cliente"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[15px] font-semibold text-foreground tabular-nums">
                        {formatCurrency(record.total ?? 0)}
                      </p>
                      <p className="mt-1 text-[12px] text-muted-foreground">{record.fecha}</p>
                    </div>
                  </div>

                  {(record.itemCount ?? 0) > 0 || record.formaPago ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(record.itemCount ?? 0) > 0 ? (
                        <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          {record.itemCount} {(record.itemCount ?? 0) === 1 ? "item" : "items"}
                        </span>
                      ) : null}

                      {record.formaPago ? (
                        <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          {record.formaPago}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}