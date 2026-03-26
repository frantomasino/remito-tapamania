"use client"

import { useMemo, useState } from "react"
import { Loader2, Printer, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

      const payload = buildDailySummaryEscPos({
        fecha,
        cantidadPedidos,
        totalDia,
        pedidos,
      })

      const { device, characteristic } = await connectBlePrinter()

      try {
        await writeEscPos(characteristic, payload)
      } finally {
        await disconnectBlePrinter(device)
      }
    } catch (error) {
      console.error("Error imprimiendo resumen del día", error)
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo imprimir el resumen del día"
      )
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
      <Button
        type="button"
        variant="outline"
        onClick={handlePrintDay}
        disabled={cantidadPedidos === 0 || isPrinting}
        className="border-white/12 bg-transparent text-white hover:bg-white/5"
      >
        {isPrinting ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
        {isPrinting ? "Imprimiendo..." : "Imprimir día"}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handleClear}
        disabled={disabledClear || isClearing}
        className="border-white/12 bg-transparent text-white hover:bg-white/5"
      >
        {isClearing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        {isClearing ? "Limpiando..." : "Limpiar día"}
      </Button>
    </div>
  )
}