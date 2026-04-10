"use client"

import Link from "next/link"
import { ClipboardList } from "lucide-react"
import { useMemo } from "react"
import { type SaleRecord, formatCurrency } from "@/lib/remito-types"

interface SalesHistoryProps {
  records: SaleRecord[]
  title?: string
  defaultExpanded?: boolean
}

export function SalesHistory({ records }: SalesHistoryProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-white/8 bg-[#161616] py-8 text-center">
        <ClipboardList className="size-5 text-[#333]" />
        <p className="text-[13px] text-[#444]">Sin pedidos cargados hoy</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/8 bg-[#161616] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#444]">
          Cargados hoy
        </p>
        <p className="text-[11px] text-[#333]">{records.length} pedidos</p>
      </div>

      <div className="divide-y divide-white/8">
        {records.map((record) => (
          <Link
            key={record.id}
            href={`/dashboard/${record.id}`}
            className="flex items-center justify-between gap-3 px-3 py-2.5 active:bg-white/5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate">
                {record.cliente || "Sin cliente"}
              </p>
              <p className="text-[11px] text-[#555] tabular-nums">
                {record.numero}
                {(record.itemCount ?? 0) > 0 && (
                  <span className="ml-1.5">· {record.itemCount} ítems</span>
                )}
              </p>
            </div>
            <p className="text-[13px] font-semibold text-white tabular-nums shrink-0">
              {formatCurrency(record.total ?? 0)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}