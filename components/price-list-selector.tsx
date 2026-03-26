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
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b0b0b6]">
        Lista de precios
      </p>

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-[#232326] p-1">
        {OPTIONS.map((option) => {
          const active = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={loading}
              className={cn(
                "flex h-11 items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-[#1976d2] text-white shadow-[0_8px_24px_rgba(25,118,210,0.18)]"
                  : "text-[#b0b0b6] hover:bg-white/5 hover:text-white",
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