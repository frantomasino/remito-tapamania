"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"

const INSTALL_KEY = "install_banner_dismissed"

export function InstallBanner({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (!userId) return
    // No mostrar si ya está instalada como PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return
    // No mostrar si ya fue descartada
    try {
      if (localStorage.getItem(`${INSTALL_KEY}:${userId}`)) return
    } catch {}
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)
    setVisible(true)
  }, [userId])

  const dismiss = () => {
    try { localStorage.setItem(`${INSTALL_KEY}:${userId}`, "1") } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-[80px] left-0 right-0 z-[90] px-4">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1565c0] text-white">
            <Download className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-gray-900">Instalá Rutix</p>
            {isIOS ? (
              <p className="mt-0.5 text-[12px] text-gray-500 leading-relaxed">
                Tocá <span className="font-semibold">Compartir</span> → <span className="font-semibold">Agregar a inicio</span> para tenerla siempre a mano.
              </p>
            ) : (
              <p className="mt-0.5 text-[12px] text-gray-500 leading-relaxed">
                Tocá los <span className="font-semibold">tres puntitos</span> → <span className="font-semibold">Agregar a pantalla de inicio</span>.
              </p>
            )}
          </div>
          <button type="button" onClick={dismiss}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 active:opacity-60">
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}