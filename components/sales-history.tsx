"use client"

import { Trash2, DollarSign, ChevronDown, ChevronUp } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  title = "Remitos",
  defaultExpanded = true,
}: SalesHistoryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const total = useMemo(() => records.reduce((s, r) => s + r.total, 0), [records])

  if (records.length === 0) {
    return (
      <section className="rounded-xl bg-card border p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            <DollarSign className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">Todavía no hay remitos para mostrar.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl bg-card border p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0"
          aria-expanded={expanded}
          aria-controls="sales-history-content"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            <DollarSign className="size-4" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {title} ({records.length})
          </h2>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Remitos: <span className="font-semibold text-foreground">{records.length}</span>
            </div>
            <div className="text-sm font-bold text-primary">Total: {formatCurrency(total)}</div>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Nro. Remito</TableHead>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-xs font-mono">{record.numero}</TableCell>
                    <TableCell className="text-xs">{record.fecha}</TableCell>
                    <TableCell className="text-xs">{record.cliente}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{formatCurrency(record.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </section>
  )
}