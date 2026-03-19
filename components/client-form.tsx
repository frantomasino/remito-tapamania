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
    <fieldset className="space-y-2.5">
      <legend className="sr-only">Datos del comercio</legend>

      <div className="space-y-1">
        <p className="text-[12px] font-medium text-foreground">Nombre del comercio</p>
        <p className="text-[11px] text-muted-foreground">Opcional</p>
      </div>

      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="client-nombre"
          value={data.nombre}
          onChange={handleNombreChange}
          placeholder="Ej: Kiosco Juan"
          inputMode="text"
          className="h-10 rounded-xl pl-9 text-[14px]"
        />
      </div>
    </fieldset>
  )
})