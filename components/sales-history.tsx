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
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardList className="size-4" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">Todavía no hay pedidos para mostrar.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 items-center gap-3 bg-transparent p-0 text-left"
          aria-expanded={expanded}
          aria-controls="sales-history-content"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardList className="size-4" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {title} ({records.length})
            </h2>
            <p className="text-xs text-muted-foreground">Total: {formatCurrency(total)}</p>
          </div>

          {expanded ? (
            <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        {onClear ? (
          <Button variant="outline" size="sm" onClick={onClear}>
            <Trash2 className="size-3.5" />
            Limpiar
          </Button>
        ) : null}
      </div>

      {expanded && (
        <div id="sales-history-content" className="flex flex-col gap-3">
          <div className="rounded-lg border bg-background px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cantidad</span>
              <span className="text-sm font-semibold text-foreground">{records.length}</span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {records.map((record) => (
              <article key={record.id} className="rounded-lg border bg-background px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Número</p>
                    <p className="font-mono text-xs text-foreground">{record.numero}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(record.total ?? 0)}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Comercio</p>
                    <p className="truncate text-sm text-foreground">{record.cliente || "Sin cliente"}</p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <p className="text-xs text-foreground">{record.fecha}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}