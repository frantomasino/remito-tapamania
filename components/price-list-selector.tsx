"use client"

import { cn } from "@/lib/utils"

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

export function PriceListSelector({
  value,
  onChange,
  loading = false,
}: PriceListSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="app-field-label">Lista de precios</p>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1 ring-1 ring-border">
        {OPTIONS.map((option) => {
          const active = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={loading}
              className={cn(
                "flex h-11 items-center justify-center rounded-2xl px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground",
                loading && "cursor-not-allowed opacity-60"
              )}
              aria-pressed={active}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}