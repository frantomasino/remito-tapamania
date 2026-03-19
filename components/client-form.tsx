"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ClientData } from "@/lib/remito-types"

interface ClientFormProps {
  data: ClientData
  onChange: (data: ClientData) => void
}

export function ClientForm({ data, onChange }: ClientFormProps) {
  const update = (field: keyof ClientData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">Datos del comercio</legend>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client-nombre">Comercio</Label>
        <Input
          id="client-nombre"
          value={data.nombre}
          onChange={(e) => update("nombre", e.target.value)}
          placeholder="Ej: Kiosco Juan"
          inputMode="text"
        />
      </div>
    </fieldset>
  )
}