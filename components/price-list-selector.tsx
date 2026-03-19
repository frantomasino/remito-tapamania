"use client"

import { Button } from "@/components/ui/button"

export type PriceListKey = "minorista" | "mayorista" | "oferta"

interface PriceListSelectorProps {
  value: PriceListKey
  onChange: (value: PriceListKey) => void
  loading?: boolean
}

const OPTIONS: Array<{ value: PriceListKey; label: string }> = [
  { value: "minorista", label: "Minorista" },
  { value: "mayorista", label: "Mayorista" },
  { value: "oferta", label: "Oferta" },
]

export function PriceListSelector({ value, onChange, loading = false }: PriceListSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-foreground">Lista de precios</label>

      <div className="grid grid-cols-1 gap-2">
        {OPTIONS.map((option) => {
          const active = value === option.value

          return (
            <Button
              key={option.value}
              type="button"
              variant={active ? "default" : "outline"}
              className="justify-start"
              onClick={() => onChange(option.value)}
              disabled={loading}
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}