"use client"

import { useState, useCallback } from "react"
import { Bluetooth, Loader2 } from "lucide-react"
import { connectBlePrinter, disconnectBlePrinter, writeEscPos } from "@/lib/bluetooth-printer"
import { buildRemitoEscPos } from "@/lib/remito-ticket-escpos"
import type { RemitoData } from "@/lib/remito-types"

interface ReimprimirButtonProps {
  remitoData: RemitoData
  empresa: string
  vendedor: string
  telefono: string
  alias: string
}

export function ReimprimirButton({ remitoData, empresa, vendedor, telefono, alias }: ReimprimirButtonProps) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const handleReimprimir = useCallback(async () => {
    if (loading) return
    try {
      setLoading(true)
      setMsg(null)
      const payload = buildRemitoEscPos(remitoData, empresa, vendedor, telefono, alias)
      const { device, characteristic } = await connectBlePrinter()
      try { await writeEscPos(characteristic, payload) } finally { await disconnectBlePrinter(device) }
      setMsg({ text: "Impreso", ok: true })
      setTimeout(() => setMsg(null), 2000)
    } catch (error) {
      const m = error instanceof Error ? error.message : ""
      if (/bluetooth no disponible/i.test(m)) setMsg({ text: "BT no disponible", ok: false })
      else if (/no se pudo abrir/i.test(m)) setMsg({ text: "¿Impresora encendida?", ok: false })
      else setMsg({ text: "No se pudo conectar", ok: false })
      setTimeout(() => setMsg(null), 2500)
    } finally {
      setLoading(false)
    }
  }, [loading, remitoData, empresa, vendedor, telefono, alias])

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleReimprimir}
        disabled={loading}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1565c0] text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-40 shadow-sm"
      >
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Bluetooth className="size-3.5" />}
        {loading ? "Conectando..." : "Reimprimir ticket"}
      </button>
      {msg && (
        <p className={`text-center text-[12px] font-medium ${msg.ok ? "text-green-600" : "text-red-500"}`}>
          {msg.text}
        </p>
      )}
    </div>
  )
}