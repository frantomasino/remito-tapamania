"use client"

import { Trash2, ClipboardList, ChevronDown, ChevronUp } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
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
      <section className="rounded-2xl border bg-card px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="size-4" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Todavía no hay pedidos para mostrar.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border bg-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-3 bg-transparent p-0 text-left"
          aria-expanded={expanded}
          aria-controls="sales-history-content"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-foreground">
                {title}
              </h2>
              <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                {records.length}
              </span>
            </div>

            <p className="mt-1 text-[12px] text-muted-foreground">
              Total {formatCurrency(total)}
            </p>
          </div>

          {expanded ? (
            <ChevronUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        {onClear ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="h-8 rounded-lg px-2.5 text-[12px]"
          >
            <Trash2 className="size-4" />
            Limpiar
          </Button>
        ) : null}
      </div>

      {expanded && (
        <div id="sales-history-content" className="mt-3 flex flex-col gap-2">
          {records.map((record) => (
            <article
              key={record.id}
              className="rounded-xl border bg-background px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[12px] font-medium text-foreground">
                    {record.numero}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-muted-foreground">
                    {record.cliente || "Sin cliente"}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-semibold text-foreground">
                    {formatCurrency(record.total ?? 0)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{record.fecha}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}