"use client"

import { useState } from "react"
import { Bluetooth, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RemitoData } from "@/lib/remito-types"
import { connectBlePrinter, disconnectBlePrinter, writeEscPos } from "@/lib/bluetooth-printer"
import { buildRemitoEscPos } from "@/lib/remito-ticket-escpos"

interface BluetoothPrintButtonProps {
  data: RemitoData
  disabled?: boolean
  onSuccess?: () => void
  onError?: (message: string) => void
}

export function BluetoothPrintButton({
  data,
  disabled,
  onSuccess,
  onError,
}: BluetoothPrintButtonProps) {
  const [printing, setPrinting] = useState(false)

  async function handleBluetoothPrint() {
    if (disabled || printing) return

    try {
      setPrinting(true)

      const payload = buildRemitoEscPos(data)
      const { device, characteristic } = await connectBlePrinter()

      try {
        await writeEscPos(characteristic, payload)
      } finally {
        await disconnectBlePrinter(device)
      }

      onSuccess?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo imprimir por Bluetooth"
      onError?.(message)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleBluetoothPrint}
      disabled={disabled || printing}
      className="h-11 rounded-xl border-white/15 bg-transparent text-white hover:bg-white/5"
    >
      {printing ? <Loader2 className="size-4 animate-spin" /> : <Bluetooth className="size-4" />}
      <span>{printing ? "Imprimiendo..." : "Bluetooth"}</span>
    </Button>
  )
}