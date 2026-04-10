"use client"

import { memo, useCallback } from "react"
import type { ClientData } from "@/lib/remito-types"

interface ClientFormProps {
  data: ClientData
  onFieldChange: <K extends keyof ClientData>(field: K, value: ClientData[K]) => void
}

export const ClientForm = memo(function ClientForm({ data, onFieldChange }: ClientFormProps) {
  const handleNombreChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onFieldChange("nombre", e.target.value),
    [onFieldChange]
  )

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="client-nombre" className="text-[12px] font-medium text-[#888]">
        Nombre del cliente
      </label>
      <input
        id="client-nombre"
        value={data.nombre}
        onChange={handleNombreChange}
        placeholder="Ej. Almacén Don José"
        inputMode="text"
        className="h-11 w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-white/20"
      />
    </div>
  )
})