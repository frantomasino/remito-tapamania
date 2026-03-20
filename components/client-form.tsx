"use client"

import { memo, useCallback } from "react"
import { Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
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

  const hasValue = data.nombre.trim().length > 0

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Datos del comercio</legend>

      <div className="flex items-center gap-3 rounded-2xl bg-muted/25 px-3 py-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-2xl transition-colors",
            hasValue ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
          )}
        >
          <Building2 className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <Input
            id="client-nombre"
            value={data.nombre}
            onChange={handleNombreChange}
            placeholder="Nombre del comercio"
            inputMode="text"
            className="border-0 bg-transparent px-0 shadow-none ring-0 focus-visible:ring-0"
          />
        </div>
      </div>
    </fieldset>
  )
})