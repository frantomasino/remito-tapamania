"use client"

import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2, Search, Package2, X, ChevronDown, ChevronUp, RotateCcw, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { type Product, type LineItem, formatCurrency } from "@/lib/remito-types"

interface ProductSelectorProps {
  products: Product[]
  items: LineItem[]
  onItemsChange: React.Dispatch<React.SetStateAction<LineItem[]>>
}

const MAX_VISIBLE_PRODUCTS = 50

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

const extractParenParts = (s: string) => {
  const matches = s.match(/\(([^)]*)\)/g)
  if (!matches) return []
  return matches.map((m) => m.replace(/^\(/, "").replace(/\)$/, "").trim()).filter(Boolean)
}

const shortDesc = (s: string) =>
  s
    .replace(/\([^)]*\)/g, "")
    .replace(/#\S+/g, "")
    .replace(/\bTapas\s+para\s+/gi, "Tapas ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim()

const detailTags = (s: string) => {
  const parts = extractParenParts(s)
    .flatMap((p) => p.split(","))
    .map((x) => x.trim())
    .filter(Boolean)
  const mapped = parts.map((t) => {
    const n = normalize(t)
    if (n === "freir" || n === "freir.") return "Freír"
    if (n === "horno" || n === "horno.") return "Horno"
    if (n === "criolla" || n === "criolla.") return "Criolla"
    if (n.includes("consultar")) return "Consultar"
    if (n.includes("mas gruesas")) return "Más gruesas"
    if (n.includes("super crocantes")) return "Súper crocantes"
    if (n.includes("fuente de fibras")) return "Fibras"
    if (n.includes("reducida en grasas")) return "Light"
    if (n.includes("4 quesos") || n.includes("cuatro quesos")) return "4 quesos"
    if (n.includes("mozzarella")) return "Mozzarella"
    if (n.includes("jamon")) return "Jamón"
    if (n.includes("nuez")) return "Nuez"
    return t
  })
  const seen = new Set<string>()
  const out: string[] = []
  if (/#promo/i.test(s)) { out.push("Promo"); seen.add("promo") }
  for (const t of mapped) {
    const key = normalize(t)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out.slice(0, 3)
}

const productOptions = (s: string) => {
  const tokens = extractParenParts(s)
    .flatMap((p) => p.split(","))
    .map((x) => x.trim())
    .filter(Boolean)
    .map((t) => t.replace(/\.+$/, ""))
  const allow = new Set([
    "horno", "freir", "criolla", "ricota", "verdura", "pollo",
    "r/v", "r/j", "p/v", "4 quesos", "cuatro quesos", "mozzarella", "jamon", "nuez",
  ])
  const normalizeLabel = (t: string) => {
    const n = normalize(t)
    if (n === "freir") return "Freír"
    if (n === "horno") return "Horno"
    if (n === "criolla") return "Criolla"
    if (n === "ricota") return "Ricota"
    if (n === "verdura") return "Verdura"
    if (n === "pollo") return "Pollo"
    if (n === "jamon") return "Jamón"
    if (n === "4 quesos" || n === "cuatro quesos") return "4 quesos"
    if (n === "mozzarella") return "Mozzarella"
    if (n === "nuez") return "Nuez"
    if (n === "r/v") return "R/V"
    if (n === "r/j") return "R/J"
    if (n === "p/v") return "P/V"
    return t
  }
  const opts = tokens.filter((t) => allow.has(normalize(t))).map(normalizeLabel)
  const seen = new Set<string>()
  const out: string[] = []
  for (const o of opts) {
    const k = normalize(o)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(o)
  }
  return out
}

const itemKey = (desc: string, opcion?: string) => `${desc}||${opcion ?? ""}`
type Derived = { title: string; tags: string[]; options: string[]; haystack: string }

// ── BOTÓN DE CANTIDAD CON INPUT INLINE ───────────────────────────────────────
interface QtyButtonProps {
  count: number
  onConfirm: (qty: number) => void
}

const QtyButton = memo(function QtyButton({ count, onConfirm }: QtyButtonProps) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const openEdit = () => {
    setVal(count > 0 ? String(count) : "")
    setEditing(true)
  }

  const confirm = () => {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 0) onConfirm(n)
    else if (val === "" || val === "0") onConfirm(0)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          autoFocus
          type="number"
          inputMode="numeric"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") setEditing(false) }}
          onBlur={confirm}
          onFocus={(e) => e.target.select()}
          className="h-10 w-14 rounded-xl border-2 border-[#1565c0] bg-white text-center text-[15px] font-bold text-gray-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); confirm() }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1565c0] text-white active:opacity-80"
        >
          <Check className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={openEdit}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-colors active:opacity-60 font-bold",
        count > 0
          ? "border-[#1565c0] bg-[#1565c0] text-white"
          : "border-gray-300 bg-white text-gray-700"
      )}
    >
      {count > 0
        ? <span className="text-[13px] font-bold leading-none">{count}</span>
        : <Plus className="size-4" />
      }
    </button>
  )
})

// ── FILA DE PRODUCTO ──────────────────────────────────────────────────────────
interface ProductRowProps {
  product: Product
  title: string
  infoTags: string[]
  options: string[]
  selectedOpt: string
  selectedCount: number
  isFirst?: boolean
  onSelectOption: (desc: string, opt: string) => void
  onSetQuantity: (product: Product, opcion: string | undefined, qty: number) => void
  onAddDevolucion: (product: Product, opcion?: string) => void
}

const ProductRow = memo(function ProductRow({
  product, title, infoTags, options, selectedOpt, selectedCount, isFirst, onSelectOption, onSetQuantity, onAddDevolucion,
}: ProductRowProps) {
  return (
    <article className="border-b border-gray-200 py-3 last:border-b-0">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-gray-900 leading-snug">{title}</p>
            <p className="text-[13px] font-medium text-gray-500 tabular-nums shrink-0">
              {formatCurrency(product.precio)}
            </p>
          </div>

          {options.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {options.map((o) => {
                const active = normalize(o) === normalize(selectedOpt)
                return (
                  <button
  key={o}
  type="button"
  onClick={() => onSelectOption(product.descripcion, o)}
  className={cn(
    "rounded-full px-3 py-1 text-[13px] font-medium transition-colors border",
    active
      ? "bg-[#1565c0] text-white border-[#1565c0]"
      : "bg-white text-gray-600 border-gray-300"
  )}
>
  {o}
</button>
                )
              })}
            </div>
          )}

          {options.length === 0 && infoTags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {infoTags.map((t) => (
                <span key={t} className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Botón devolución */}
        <button
          type="button"
          onClick={() => onAddDevolucion(product, selectedOpt || undefined)}
          {...(isFirst ? { "data-onboarding": "devolucion" } : {})}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-orange-300 bg-white text-orange-400 transition-colors active:opacity-60"
        >
          <RotateCcw className="size-4" />
        </button>

        {/* Botón cantidad con input inline */}
        <div {...(isFirst ? { "data-onboarding": "add-qty" } : {})}>
  <QtyButton
    count={selectedCount}
    onConfirm={(qty) => onSetQuantity(product, selectedOpt || undefined, qty)}
  />
</div>
      </div>
    </article>
  )
})

// ── CARRITO AGRUPADO ──────────────────────────────────────────────────────────
type CartGroup = {
  baseDesc: string
  title: string
  precio: number
  totalCantidad: number
  totalSubtotal: number
  totalDevolucion: number
  items: LineItem[]
  hasOpciones: boolean
  options: string[]
}

function groupCartItems(items: LineItem[], derivedByDesc: Map<string, Derived>): CartGroup[] {
  const groups = new Map<string, CartGroup>()
  for (const item of items) {
    const baseDesc = item.product.descripcion
    const d = derivedByDesc.get(baseDesc)
    const title = d?.title ?? shortDesc(baseDesc)
    const options = d?.options ?? productOptions(baseDesc)
    if (groups.has(baseDesc)) {
      const g = groups.get(baseDesc)!
      g.totalCantidad += item.cantidad
      g.totalSubtotal += item.subtotal
      g.totalDevolucion += item.devolucion ?? 0
      g.items.push(item)
      if (item.opcion) g.hasOpciones = true
    } else {
      groups.set(baseDesc, {
        baseDesc, title, options,
        precio: item.product.precio,
        totalCantidad: item.cantidad,
        totalSubtotal: item.subtotal,
        totalDevolucion: item.devolucion ?? 0,
        items: [item],
        hasOpciones: !!item.opcion,
      })
    }
  }
  return Array.from(groups.values())
}

interface CartGroupRowProps {
  group: CartGroup
  onRemoveGroup: (desc: string) => void
  onRemoveSingle: (desc: string, opcion?: string) => void
  onUpdateQuantity: (desc: string, opcion: string | undefined, cantidad: number) => void
  onUpdateDevolucion: (desc: string, opcion: string | undefined, devolucion: number) => void
}

const CartGroupRow = memo(function CartGroupRow({
  group, onRemoveGroup, onRemoveSingle, onUpdateQuantity, onUpdateDevolucion,
}: CartGroupRowProps) {
  const [localVal, setLocalVal] = useState(String(group.totalCantidad))
  useEffect(() => { setLocalVal(String(group.totalCantidad)) }, [group.totalCantidad])

  if (group.hasOpciones && group.options.length > 1) {
    const ventaResumen = group.items.filter((i) => i.cantidad > 0).map((i) => `${i.cantidad} ${i.opcion ?? ""}`).join(", ")
    const devResumen = group.items.filter((i) => (i.devolucion ?? 0) > 0).map((i) => `${i.devolucion} ${i.opcion ?? ""}`).join(", ")

    return (
      <div className="border-b border-gray-200 last:border-b-0 py-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-gray-900">
              {group.title}
              <span className="ml-1.5 text-gray-500 font-normal text-[12px]">· {group.totalCantidad} u.</span>
              {group.totalDevolucion > 0 && (
                <span className="ml-1.5 text-orange-500 font-normal text-[12px]">({group.totalDevolucion} dev.)</span>
              )}
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">{ventaResumen}</p>
            {devResumen && <p className="text-[12px] text-orange-500 mt-0.5">Dev: {devResumen}</p>}
            <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">{formatCurrency(group.totalSubtotal)}</p>
          </div>
          <button type="button" onClick={() => onRemoveGroup(group.baseDesc)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 active:opacity-60">
            <X className="size-3.5" />
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-2 pl-1">
          {group.items.map((item) => (
            <div key={itemKey(item.product.descripcion, item.opcion)}>
              <p className="text-[12px] font-medium text-gray-600 mb-1">{item.opcion}</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] text-gray-400 w-10">Venta:</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => item.cantidad > 1 ? onUpdateQuantity(item.product.descripcion, item.opcion, item.cantidad - 1) : onRemoveSingle(item.product.descripcion, item.opcion)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 text-base font-bold active:opacity-60">−</button>
                  <span className="w-7 text-center text-[13px] font-bold text-gray-900 tabular-nums">{item.cantidad}</span>
                  <button type="button" onClick={() => onUpdateQuantity(item.product.descripcion, item.opcion, item.cantidad + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 text-base font-bold active:opacity-60">+</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-orange-500 w-10">Dev:</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => onUpdateDevolucion(item.product.descripcion, item.opcion, Math.max(0, (item.devolucion ?? 0) - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-orange-300 bg-white text-orange-400 text-base font-bold active:opacity-60">−</button>
                  <span className="w-7 text-center text-[13px] font-bold text-orange-500 tabular-nums">{item.devolucion ?? 0}</span>
                  <button type="button" onClick={() => onUpdateDevolucion(item.product.descripcion, item.opcion, (item.devolucion ?? 0) + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-orange-300 bg-white text-orange-400 text-base font-bold active:opacity-60">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const item = group.items[0]
  const handleBlur = () => {
    const parsed = parseInt(localVal, 10)
    if (!isNaN(parsed) && parsed > 0) onUpdateQuantity(item.product.descripcion, item.opcion, parsed)
    else setLocalVal(String(item.cantidad))
  }

  return (
    <div className="border-b border-gray-200 last:border-b-0 py-2.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-gray-900 truncate">
            {group.title}
            {group.totalDevolucion > 0 && (
              <span className="ml-1.5 text-orange-500 font-normal text-[12px]">({group.totalDevolucion} dev.)</span>
            )}
          </p>
          <p className="text-[11px] text-gray-400 tabular-nums">
            {formatCurrency(group.totalSubtotal)}
            {group.totalCantidad > 1 && (
              <span className="ml-1">({group.totalCantidad} × {formatCurrency(group.precio)})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button"
            onClick={() => item.cantidad > 1 && onUpdateQuantity(item.product.descripcion, item.opcion, item.cantidad - 1)}
            disabled={item.cantidad <= 1}
            className={cn("flex h-8 w-8 items-center justify-center rounded-lg border text-base font-bold",
              item.cantidad > 1 ? "border-gray-300 bg-white text-gray-700 active:opacity-60" : "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
            )}>−</button>
          <input
            type="number" inputMode="numeric" pattern="[0-9]*"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleBlur}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="h-8 w-10 rounded-lg border border-gray-300 bg-white text-center text-[13px] font-bold text-gray-900 outline-none focus:border-[#1565c0] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button type="button"
            onClick={() => onUpdateQuantity(item.product.descripcion, item.opcion, item.cantidad + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-base font-bold text-gray-700 active:opacity-60">+</button>
          <div className="flex items-center gap-0.5 ml-1">
            <button type="button"
              onClick={() => onUpdateDevolucion(item.product.descripcion, item.opcion, Math.max(0, (item.devolucion ?? 0) - 1))}
              className="flex h-8 w-7 items-center justify-center rounded-lg border border-orange-300 bg-white text-orange-400 text-base font-bold active:opacity-60">−</button>
            <span className="w-6 text-center text-[12px] font-bold text-orange-500 tabular-nums">{item.devolucion ?? 0}</span>
            <button type="button"
              onClick={() => onUpdateDevolucion(item.product.descripcion, item.opcion, (item.devolucion ?? 0) + 1)}
              className="flex h-8 w-7 items-center justify-center rounded-lg border border-orange-300 bg-white text-orange-400 text-base font-bold active:opacity-60">+</button>
          </div>
          <button type="button"
            onClick={() => onRemoveSingle(item.product.descripcion, item.opcion)}
            className="flex h-8 w-7 items-center justify-center rounded-lg text-gray-300 hover:text-red-500 active:opacity-60">
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
})

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export function ProductSelector({ products, items, onItemsChange }: ProductSelectorProps) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedOptionByDesc, setSelectedOptionByDesc] = useState<Record<string, string>>({})
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_PRODUCTS)

  const prevLengthRef = useRef(0)
  const scrollRef = useRef(0)
  useEffect(() => {
    // Guardar scroll ANTES del cambio
    scrollRef.current = window.scrollY
  })
  useEffect(() => {
    if (prevLengthRef.current !== items.length) {
      prevLengthRef.current = items.length
      // Restaurar scroll en el próximo frame
      const saved = scrollRef.current
      requestAnimationFrame(() => {
        window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior })
      })
    }
  }, [items.length])

  const getSelectedOpt = useCallback((desc: string) => selectedOptionByDesc[desc] ?? "", [selectedOptionByDesc])
  const setSelectedOpt = useCallback((desc: string, opt: string) => {
    setSelectedOptionByDesc((prev) => prev[desc] === opt ? prev : { ...prev, [desc]: opt })
  }, [])

  const derivedByDesc = useMemo(() => {
    const m = new Map<string, Derived>()
    for (const p of products) {
      const title = shortDesc(p.descripcion)
      const tags = detailTags(p.descripcion)
      const options = productOptions(p.descripcion)
      const haystack = normalize(`${p.descripcion} ${title} ${tags.join(" ")} ${options.join(" ")}`)
      m.set(p.descripcion, { title, tags, options, haystack })
    }
    return m
  }, [products])

  const filtered = useMemo(() => {
    const q = normalize(deferredSearch.trim())
    if (!q) return products
    return products.filter((p) => (derivedByDesc.get(p.descripcion)?.haystack ?? "").includes(q))
  }, [products, deferredSearch, derivedByDesc])

  const visibleProducts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  const itemCountByKey = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      const key = itemKey(item.product.descripcion, item.opcion)
      map.set(key, (map.get(key) ?? 0) + item.cantidad)
    }
    return map
  }, [items])

  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])
  const totalDevolucion = useMemo(() => items.reduce((s, i) => s + (i.devolucion ?? 0), 0), [items])
  const cartGroups = useMemo(() => groupCartItems(items, derivedByDesc), [items, derivedByDesc])

  // Setear cantidad directa (desde QtyButton)
  const setQuantity = useCallback((product: Product, opcion: string | undefined, qty: number) => {
    const key = itemKey(product.descripcion, opcion)
    onItemsChange((prev) => {
      const idx = prev.findIndex((i) => itemKey(i.product.descripcion, i.opcion) === key)
      if (qty <= 0) {
        if (idx < 0) return prev
        const cur = prev[idx]
        if ((cur.devolucion ?? 0) > 0) {
          const next = prev.slice()
          next[idx] = { ...cur, cantidad: 0, subtotal: 0 }
          return next
        }
        return prev.filter((i) => itemKey(i.product.descripcion, i.opcion) !== key)
      }
      if (idx >= 0) {
        const next = prev.slice()
        const cur = next[idx]
        next[idx] = { ...cur, cantidad: qty, subtotal: qty * cur.product.precio }
        return next
      }
      return [...prev, { product, cantidad: qty, subtotal: qty * product.precio, opcion }]
    })
  }, [onItemsChange])

  const addDevolucion = useCallback((product: Product, opcion?: string) => {
    const key = itemKey(product.descripcion, opcion)
    onItemsChange((prev) => {
      const idx = prev.findIndex((i) => itemKey(i.product.descripcion, i.opcion) === key)
      if (idx >= 0) {
        const next = prev.slice()
        const cur = next[idx]
        next[idx] = { ...cur, devolucion: (cur.devolucion ?? 0) + 1 }
        return next
      }
      return [...prev, { product, cantidad: 0, subtotal: 0, opcion, devolucion: 1 }]
    })
  }, [onItemsChange])

  const updateQuantity = useCallback((desc: string, opcion: string | undefined, cantidad: number) => {
    const key = itemKey(desc, opcion)
    onItemsChange((prev) => {
      const idx = prev.findIndex((i) => itemKey(i.product.descripcion, i.opcion) === key)
      if (idx < 0) return prev
      if (cantidad <= 0) {
        const cur = prev[idx]
        if ((cur.devolucion ?? 0) > 0) {
          const next = prev.slice()
          next[idx] = { ...cur, cantidad: 0, subtotal: 0 }
          return next
        }
        return prev.filter((i) => itemKey(i.product.descripcion, i.opcion) !== key)
      }
      const next = prev.slice()
      const cur = next[idx]
      if (cur.cantidad === cantidad) return prev
      next[idx] = { ...cur, cantidad, subtotal: cantidad * cur.product.precio }
      return next
    })
  }, [onItemsChange])

  const updateDevolucion = useCallback((desc: string, opcion: string | undefined, devolucion: number) => {
    const key = itemKey(desc, opcion)
    onItemsChange((prev) => {
      const idx = prev.findIndex((i) => itemKey(i.product.descripcion, i.opcion) === key)
      if (idx < 0) return prev
      const next = prev.slice()
      const cur = next[idx]
      if (devolucion <= 0 && cur.cantidad <= 0) {
        return prev.filter((i) => itemKey(i.product.descripcion, i.opcion) !== key)
      }
      next[idx] = { ...cur, devolucion: Math.max(0, devolucion) }
      return next
    })
  }, [onItemsChange])

  const removeItem = useCallback((desc: string, opcion?: string) => {
    const key = itemKey(desc, opcion)
    onItemsChange((prev) => prev.filter((i) => itemKey(i.product.descripcion, i.opcion) !== key))
  }, [onItemsChange])

  const removeGroup = useCallback((desc: string) => {
    onItemsChange((prev) => prev.filter((i) => i.product.descripcion !== desc))
  }, [onItemsChange])

  useEffect(() => { setVisibleCount(MAX_VISIBLE_PRODUCTS) }, [deferredSearch, products])

  return (
    <>
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-sm border-gray-200 bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-semibold text-gray-900">Vaciar pedido</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-gray-500">
            Se eliminan {items.length} {items.length === 1 ? "producto" : "productos"}.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setConfirmClearOpen(false)}
              className="flex h-10 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white text-[13px] font-medium text-gray-700 active:opacity-60">
              Cancelar
            </button>
            <button type="button" onClick={() => { onItemsChange([]); setConfirmClearOpen(false) }}
              className="flex h-10 flex-1 items-center justify-center rounded-xl bg-red-500 text-[13px] font-semibold text-white active:opacity-80">
              Vaciar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3">

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#1565c0] shadow-sm"
          />
        </div>

        {items.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <button type="button" onClick={() => setCartOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left active:opacity-70 bg-gray-50">
              <div className="flex items-center gap-2">
                {cartOpen ? <ChevronUp className="size-3.5 text-gray-400" /> : <ChevronDown className="size-3.5 text-gray-400" />}
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Pedido · {cartGroups.length} {cartGroups.length === 1 ? "producto" : "productos"}
                </span>
                {totalDevolucion > 0 && (
                  <span className="text-[11px] font-medium text-orange-500">· {totalDevolucion} dev.</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{formatCurrency(total)}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmClearOpen(true) }}
                  className="flex items-center text-red-400 active:opacity-60">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </button>

            {cartOpen && (
              <div className="border-t border-gray-200 px-3">
                {cartGroups.map((group) => (
                  <CartGroupRow
                    key={group.baseDesc}
                    group={group}
                    onRemoveGroup={removeGroup}
                    onRemoveSingle={removeItem}
                    onUpdateQuantity={updateQuantity}
                    onUpdateDevolucion={updateDevolucion}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-gray-50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Productos</p>
            <p className="text-[11px] text-gray-400">{filtered.length} disponibles</p>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Package2 className="size-6 text-gray-300" />
              <p className="text-sm text-gray-400">No hay productos cargados</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Search className="size-6 text-gray-300" />
              <p className="text-sm text-gray-400">Sin resultados para "{search}"</p>
            </div>
          ) : (
            <div className="px-3">
              {visibleProducts.map((p, idx) => {
                const d = derivedByDesc.get(p.descripcion)
                const title = d?.title ?? shortDesc(p.descripcion)
                const options = d?.options ?? productOptions(p.descripcion)
                const infoTags = d?.tags ?? detailTags(p.descripcion)
                const selectedOpt = options.length > 0 ? (getSelectedOpt(p.descripcion) || options[0]) : ""
                const selectedCount = options.length > 0
                  ? itemCountByKey.get(itemKey(p.descripcion, selectedOpt)) ?? 0
                  : itemCountByKey.get(itemKey(p.descripcion)) ?? 0

                return (
                  <ProductRow
                    key={p.descripcion}
                    product={p}
                    title={title}
                    infoTags={infoTags}
                    options={options}
                    selectedOpt={selectedOpt}
                    selectedCount={selectedCount}
                    isFirst={idx === 0}
                    onSelectOption={setSelectedOpt}
                    onSetQuantity={setQuantity}
                    onAddDevolucion={addDevolucion}
                  />
                )
              })}
            </div>
          )}

          {filtered.length > visibleCount && (
            <div className="px-3 pb-3 pt-1">
              <button type="button"
                onClick={() => setVisibleCount((prev) => prev + MAX_VISIBLE_PRODUCTS)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm text-gray-500 active:opacity-60">
                Ver {filtered.length - visibleCount} más
              </button>
            </div>
          )}
        </div>

      </div>
    </>
  )
}