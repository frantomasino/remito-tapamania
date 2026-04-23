"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-100 px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="size-8 text-red-500" />
        </div>
        <h1 className="text-[22px] font-semibold text-gray-900">Algo salió mal</h1>
        <p className="mt-2 text-[13px] text-gray-500">Ocurrió un error inesperado. Intentá de nuevo.</p>
        <button type="button" onClick={reset}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#1565c0] text-[14px] font-semibold text-white active:opacity-80">
          Reintentar
        </button>
      </div>
    </div>
  )
}