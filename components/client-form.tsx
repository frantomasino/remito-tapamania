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
    <fieldset className="space-y-3">
      <legend className="sr-only">Datos del comercio</legend>

      <div className="rounded-2xl border bg-background px-4 py-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-2xl transition-colors",
              hasValue ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
            )}
          >
            <Building2 className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-foreground">
                Nombre del comercio
              </p>
              <span className="rounded-full border bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Opcional
              </span>
            </div>

            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Se imprime en el remito si lo completás.
            </p>

            <div className="mt-3">
              <Input
                id="client-nombre"
                value={data.nombre}
                onChange={handleNombreChange}
                placeholder="Ej: Kiosco Juan"
                inputMode="text"
                className="h-11 rounded-2xl border bg-background pl-4 text-[14px]"
              />
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  )
})