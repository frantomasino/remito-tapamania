"use client"

import { useState } from "react"
import { Bluetooth, Eye, Plus, RotateCcw, Search, Tag } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { cn } from "@/lib/utils"

/**
 * Preview visual de la UX mobile (sin auth de la app).
 * Solo para revisar tamaños de botones / nav. No guarda ni imprime nada.
 */
export default function MobilePreviewPage() {
  const [qty, setQty] = useState(2)
  const [dev, setDev] = useState(0)

  return (
    <div className="min-h-dvh bg-gray-100 text-gray-900">
      <div className="mx-auto w-full max-w-md pb-[calc(140px+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400">Preview UX · Boleta</p>
              <p className="text-[13px] font-semibold text-gray-900">Solo diseño — no guarda datos</p>
            </div>
            <button
              type="button"
              className="flex h-10 shrink-0 items-center gap-1 rounded-xl border border-gray-300 bg-gray-50 px-3 text-[13px] font-medium text-gray-600"
            >
              <Plus className="size-3.5" />Nuevo
            </button>
          </div>
        </header>

        <main className="px-4 pt-3">
          <input
            type="text"
            readOnly
            value="Cliente de ejemplo"
            className="mb-3 h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-[16px] text-gray-900 shadow-sm"
          />

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              readOnly
              placeholder="Buscar producto..."
              className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-[16px] text-gray-900 placeholder:text-gray-400 shadow-sm"
            />
          </div>

          <article className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-gray-900">Tapas criollas</p>
                <p className="mt-0.5 text-[12px] text-gray-500">$12.500</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="min-h-10 rounded-full border border-[#1565c0] bg-[#1565c0] px-3.5 py-2 text-[14px] font-medium text-white">
                    Freír
                  </span>
                  <span className="min-h-10 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-[14px] font-medium text-gray-600">
                    Horno
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-orange-300 bg-white text-orange-400"
              >
                <RotateCcw className="size-5" />
              </button>
              <button
                type="button"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[#1565c0] bg-[#1565c0] text-[15px] font-bold text-white"
              >
                {qty}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-lg font-bold text-gray-700"
                >
                  −
                </button>
                <span className="w-8 text-center text-[15px] font-bold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((n) => n + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-lg font-bold text-gray-700"
                >
                  +
                </button>
              </div>
              <div className="mx-1 h-5 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <span className="mr-0.5 text-[12px] font-medium text-orange-500">Dev</span>
                <button
                  type="button"
                  onClick={() => setDev((n) => Math.max(0, n - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-300 bg-white text-lg font-bold text-orange-400"
                >
                  −
                </button>
                <span className="w-8 text-center text-[15px] font-bold tabular-nums text-orange-500">{dev}</span>
                <button
                  type="button"
                  onClick={() => setDev((n) => n + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-300 bg-white text-lg font-bold text-orange-400"
                >
                  +
                </button>
              </div>
            </div>
          </article>

          <p className="mt-4 text-center text-[12px] text-gray-400">
            Tocá los botones: son del tamaño propuesto para uso diario.
          </p>
        </main>
      </div>

      <div
        className="fixed inset-x-0 z-40 border-t border-gray-200 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
        style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold tabular-nums leading-none text-gray-900">$25.000</p>
          </div>
          <button
            type="button"
            className={cn(
              "flex h-12 items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-600"
            )}
          >
            <Tag className="size-4" />Desc.
          </button>
          <button
            type="button"
            className="flex h-12 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 text-[14px] font-medium text-gray-600"
          >
            <Eye className="size-4" />Ver
          </button>
          <button
            type="button"
            className="flex h-12 items-center gap-1.5 rounded-xl bg-[#1565c0] px-4 text-[14px] font-semibold text-white"
          >
            <Bluetooth className="size-4" />Imprimir
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
