"use client"

import { Camera, Package2 } from "lucide-react"

export function StockScanner() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-gray-50">
        <Package2 className="size-4 text-gray-400" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Stock del día</p>
      </div>
      <div className="px-3 py-3">
        <button
          type="button"
          disabled
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-[13px] font-semibold text-gray-400 cursor-not-allowed"
        >
          <Camera className="size-4" />
          Cargar stock con foto
        </button>
        <p className="mt-2 text-center text-[12px] text-gray-400">Próximamente disponible</p>
      </div>
    </div>
  )
}