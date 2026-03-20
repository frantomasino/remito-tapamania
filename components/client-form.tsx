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

      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background text-muted-foreground ring-1 ring-border">
          <Building2 className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="app-field-label">Nombre</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo si querés incluirlo en el remito.
          </p>
        </div>
      </div>

      <Input
        id="client-nombre"
        value={data.nombre}
        onChange={handleNombreChange}
        placeholder="Nombre del comercio"
        inputMode="text"
        className="app-input"
      />
    </fieldset>
  )
})