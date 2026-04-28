"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { X, ChevronRight } from "lucide-react"

type Step = {
  target: string
  title: string
  desc: string
  position: "top" | "bottom"
}

const STEPS: Step[] = [
  {
    target: "add-qty",
    title: "Agregá un producto",
    desc: "Tocá el + para agregar la cantidad que necesitás. El número se actualiza solo.",
    position: "bottom",
  },
  {
    target: "devolucion",
    title: "Registrá una devolución",
    desc: "El botón naranja registra unidades que te devuelven. No afecta el total del pedido.",
    position: "bottom",
  },
  {
    target: "nav-pedidos",
    title: "Revisá tus pedidos",
    desc: "Al imprimir el remito se guarda automáticamente acá. Podés filtrar por día, semana o mes y ver formas de pago.",
    position: "top",
  },
  {
    target: "",
    title: "Total e Imprimir",
    desc: "Cuando agregás productos aparece abajo el total, el botón Ver para previsualizar y el botón Imprimir para enviar.",
    position: "bottom",
  },
]

type Rect = { top: number; left: number; width: number; height: number }

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-onboarding="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

const PAD = 8

interface OnboardingProps {
  userId: string
}

export function Onboarding({ userId }: OnboardingProps) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [ready, setReady] = useState(false)

  const storageKey = userId ? `onboarding_v2:${userId}` : null

  useEffect(() => {
    if (!storageKey) return
    try {
      if (!localStorage.getItem(storageKey)) setVisible(true)
    } catch {}
  }, [storageKey])

  const updateRect = useCallback((s: number) => {
    const r = getTargetRect(STEPS[s].target)
    setRect(r)
    setReady(!!r)
  }, [])

  useEffect(() => {
    if (!visible) return
    setReady(false)
    const t = setTimeout(() => updateRect(step), 200)
    return () => clearTimeout(t)
  }, [visible, step, updateRect])

  const dismiss = useCallback(() => {
    if (storageKey) try { localStorage.setItem(storageKey, "1") } catch {}
    setVisible(false)
  }, [storageKey])

  const next = useCallback(() => {
    if (step === STEPS.length - 1) { dismiss(); return }
    setReady(false)
    setStep(s => s + 1)
  }, [step, dismiss])

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const vw = typeof window !== "undefined" ? window.innerWidth : 390
  const vh = typeof window !== "undefined" ? window.innerHeight : 844

  const tooltipW = Math.min(vw - 32, 300)
  let tooltipTop = 0
  let tooltipLeft = 16

  if (rect) {
    tooltipTop = current.position === "bottom"
      ? rect.top + rect.height + PAD + 8
      : rect.top - 220 - PAD
    tooltipLeft = Math.max(16, Math.min(rect.left, vw - tooltipW - 16))
    tooltipTop = Math.max(60, Math.min(tooltipTop, vh - 210))
  }

  const tooltipContent = (
    <>
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={cn(
              "rounded-full transition-all duration-200",
              i === step ? "w-5 h-2 bg-white" : i < step ? "w-2 h-2 bg-white opacity-30" : "w-2 h-2 bg-white opacity-15"
            )} />
          ))}
        </div>
        <button type="button" onClick={dismiss}
          className="flex h-7 w-7 items-center justify-center rounded-full active:opacity-60"
          style={{ background: "rgba(255,255,255,0.15)" }}>
          <X className="size-3.5 text-white" />
        </button>
      </div>
      <div className="px-4 pt-3 pb-1">
        <p className="text-[15px] font-semibold text-white">{current.title}</p>
        <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{current.desc}</p>
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={dismiss}
          className="text-[12px] px-1 py-1.5 active:opacity-60"
          style={{ color: "rgba(255,255,255,0.5)" }}>
          Omitir
        </button>
        <button type="button" onClick={next}
          className="flex flex-1 items-center justify-center gap-1 h-10 rounded-xl text-[13px] font-semibold active:opacity-80"
          style={{ background: "#1565c0", color: "#fff" }}>
          {isLast ? "¡Listo!" : "Siguiente"}
          {!isLast && <ChevronRight className="size-4" />}
        </button>
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: "none" }}>

      {/* Overlay con hueco */}
      {rect && ready && (
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "all" }} onClick={next}>
          <defs>
            <mask id="hole">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - PAD} y={rect.top - PAD}
                width={rect.width + PAD * 2} height={rect.height + PAD * 2}
                rx="12" fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#hole)" />
        </svg>
      )}

      {/* Overlay sin hueco cuando no encuentra el elemento */}
      {!ready && visible && (
        <div className="absolute inset-0 bg-black/65" style={{ pointerEvents: "all" }} onClick={next} />
      )}

      {/* Borde highlight */}
      {rect && ready && (
        <div className="absolute rounded-xl pointer-events-none" style={{
          top: rect.top - PAD, left: rect.left - PAD,
          width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          border: "2.5px solid #fff",
          boxShadow: "0 0 0 3px rgba(255,255,255,0.25)",
          transition: "all 0.2s ease",
        }} />
      )}

      {/* Tooltip con elemento resaltado */}
      {ready && (
        <div className="absolute rounded-2xl overflow-hidden shadow-2xl"
          style={{
            top: tooltipTop, left: tooltipLeft, width: tooltipW,
            background: "#0d2b5e",
            pointerEvents: "all",
            transition: "top 0.2s ease, left 0.2s ease",
          }}>
          {tooltipContent}
        </div>
      )}

      {/* Fallback centrado cuando no encuentra el elemento */}
      {!ready && visible && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "all" }}>
          <div className="rounded-2xl shadow-2xl overflow-hidden mx-4 w-full max-w-sm" style={{ background: "#0d2b5e" }}>
            {tooltipContent}
          </div>
        </div>
      )}
    </div>
  )
}