"use client"

import { useMemo, useState } from "react"
import { Loader2, Printer, Trash2 } from "lucide-react"
import { connectBlePrinter, disconnectBlePrinter, writeEscPos } from "@/lib/bluetooth-printer"
import {
  buildDailySummaryEscPos,
  type DailySummaryItem,
} from "@/lib/daily-summary-ticket-escpos"

type PedidosDayActionsProps = {
  fecha: string
  totalDia: number
  onClearAction: () => Promise<void>
  disabledClear?: boolean
  pedidos: DailySummaryItem[]
}

export function PedidosDayActions({
  fecha,
  totalDia,
  onClearAction,
  disabledClear = false,
  pedidos,
}: PedidosDayActionsProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const cantidadPedidos = useMemo(() => pedidos.length, [pedidos])

  async function handlePrintDay() {
    if (isPrinting || cantidadPedidos === 0) return
    try {
      setIsPrinting(true)
      const payload = buildDailySummaryEscPos({ fecha, cantidadPedidos, totalDia, pedidos })
      const { device, characteristic } = await connectBlePrinter()
      try { await writeEscPos(characteristic, payload) } finally { await disconnectBlePrinter(device) }
    } catch (error) {
      console.error("Error imprimiendo resumen del día", error)
      alert(error instanceof Error ? error.message : "No se pudo imprimir el resumen del día")
    } finally {
      setIsPrinting(false)
    }
  }

  async function handleClear() {
    if (isClearing || disabledClear) return
    try {
      setIsClearing(true)
      await onClearAction()
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={handlePrintDay}
        disabled={cantidadPedidos === 0 || isPrinting}
        className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-[#161616] text-[13px] font-medium text-[#888] active:opacity-60 disabled:opacity-30"
      >
        {isPrinting ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
        {isPrinting ? "Imprimiendo..." : "Imprimir día"}
      </button>

      <button
        type="button"
        onClick={handleClear}
        disabled={disabledClear || isClearing}
        className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-[#161616] text-[13px] font-medium text-[#ff5555] active:opacity-60 disabled:opacity-30"
      >
        {isClearing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        {isClearing ? "Limpiando..." : "Limpiar día"}
      </button>
    </div>
  )
}