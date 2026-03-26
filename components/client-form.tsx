"use client"

import { memo, useCallback } from "react"
import { Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { ClientData } from "@/lib/remito-types"

interface ClientFormProps {
  data: ClientData
  onFieldChange: <K extends keyof ClientData>(field: K, value: ClientData[K]) => void
}

export const ClientForm = memo(function ClientForm({
  data,
  onFieldChange,
}: ClientFormProps) {
  const handleNombreChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("nombre", e.target.value)
    },
    [onFieldChange]
  )

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Datos del comercio</legend>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#232326] text-[#b0b0b6] ring-1 ring-white/10">
            <Building2 className="size-4" />
          </div>

          <div className="min-w-0">
            <label
              htmlFor="client-nombre"
              className="text-sm font-semibold text-white"
            >
              Nombre del comercio
            </label>
            <p className="mt-1 text-sm text-[#9e9ea6]">
              Se imprime en el remito si lo completás.
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-[#232326] px-2.5 py-1 text-[11px] font-medium text-[#b0b0b6]">
          Opcional
        </span>
      </div>

      <Input
        id="client-nombre"
        value={data.nombre}
        onChange={handleNombreChange}
        placeholder="Ej. Almacén Don José"
        inputMode="text"
        className="h-11 rounded-xl border-white/10 bg-[#1a1a1c] px-4 text-[15px] text-white placeholder:text-[#8f8f95] focus-visible:ring-2 focus-visible:ring-white/15"
      />
    </fieldset>
  )
})