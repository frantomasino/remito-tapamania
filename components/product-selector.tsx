"use client"

import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2, Search, Package2, X, ChevronDown, ChevronUp, Pencil } from "lucide-react"
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

// ── MODAL DE OPCIONES MÚLTIPLES ───────────────────────────────────────────────
interface MultiOptionModalProps {
  open: boolean
  product: Product | null
  title: string
  options: string[]
  currentQtys: Record<string, number>
  onConfirm: (qtys: Record<string, number>) => void
  onClose: () => void
}

function MultiOptionModal({ open, product, title, options, currentQtys, onConfirm, onClose }: MultiOptionModalProps) {
  const [qtys, setQtys] = useState<Record<string, number>>({})

  useEffect(() => {
    if (open) {
      const init: Record<string, number> = {}
      for (const o of options) init[o] = currentQtys[o] ?? 0
      setQtys(init)
    }
  }, [open, options, currentQtys])

  const totalUnidades = Object.values(qtys).reduce((s, v) => s + v, 0)

  const handleChange = (opcion: string, delta: number) => {
    setQtys((prev) => ({ ...prev, [opcion]: Math.max(0, (prev[opcion] ?? 0) + delta) }))
  }

  const handleInput = (opcion: string, val: string) => {
    const n = parseInt(val, 10)
    setQtys((prev) => ({ ...prev, [opcion]: isNaN(n) || n < 0 ? 0 : n }))
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      {/* ── max-h + overflow-y-auto para que sea scrolleable cuando sube el teclado ── */}
      <DialogContent className="max-w-sm border-white/10 bg-[#1b1b1d] text-white max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-semibold text-white">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-[#666]">Seleccioná la cantidad de cada tipo</p>

        <div className="flex flex-col divide-y divide-white/8 mt-1">
          {options.map((opcion) => (
            <div key={opcion} className="flex items-center justify-between py-3">
              <span className="text-[14px] font-medium text-white">{opcion}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChange(opcion, -1)}
                  disabled={(qtys[opcion] ?? 0) === 0}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold",
                    (qtys[opcion] ?? 0) > 0
                      ? "bg-[#2a2a2e] text-white active:opacity-60"
                      : "bg-[#1a1a1c] text-[#333] cursor-not-allowed"
                  )}
                >−</button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={qtys[opcion] ?? 0}
                  onChange={(e) => handleInput(opcion, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="h-9 w-12 rounded-lg border border-white/10 bg-[#1a1a1c] text-center text-[15px] font-bold text-white outline-none focus:border-[#1976d2] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => handleChange(opcion, 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a2a2e] text-lg font-bold text-white active:opacity-60"
                >+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/8">
          <span className="text-[12px] text-[#666]">Total unidades:</span>
          <span className="text-[15px] font-bold text-white">{totalUnidades}</span>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-transparent text-[13px] font-medium text-white active:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(qtys)}
            disabled={totalUnidades === 0}
            className="flex h-10 flex-[2] items-center justify-center rounded-xl bg-[#1976d2] text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-30"
          >
            Confirmar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── FILA DE PRODUCTO (lista) ──────────────────────────────────────────────────
interface ProductRowProps {
  product: Product
  title: string
  infoTags: string[]
  options: string[]
  totalSelected: number
  onAdd: (product: Product, opcion?: string) => void
  onOpenMulti: (product: Product) => void
}

const ProductRow = memo(function ProductRow({
  product, title, infoTags, options, totalSelected, onAdd, onOpenMulti,
}: ProductRowProps) {
  const hasMultiOptions = options.length > 1

  return (
    <article className="border-b border-white/8 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-white leading-snug">{title}</p>
            <p className="text-[13px] font-medium text-[#666] tabular-nums shrink-0">
              {formatCurrency(product.precio)}
            </p>
          </div>
          {options.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {options.map((o) => (
                <span key={o} className="rounded-full bg-[#222] px-2 py-0.5 text-[11px] text-[#666]">
                  {o}
                </span>
              ))}
            </div>
          )}
          {options.length === 0 && infoTags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {infoTags.map((t) => (
                <span key={t} className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[11px] text-[#555]">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {hasMultiOptions ? (
          <button
            type="button"
            onClick={() => onOpenMulti(product)}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors active:opacity-60",
              totalSelected > 0
                ? "border-[#1976d2]/40 bg-[#1976d2]/15 text-[#60aaff]"
                : "border-white/10 bg-[#1e1e20] text-white"
            )}
          >
            {totalSelected > 0
              ? <span className="text-[12px] font-bold leading-none">{totalSelected}</span>
              : <Plus className="size-4" />
            }
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAdd(product, options[0] || undefined)}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors active:opacity-60",
              totalSelected > 0
                ? "border-[#1976d2]/40 bg-[#1976d2]/15 text-[#60aaff]"
                : "border-white/10 bg-[#1e1e20] text-white"
            )}
          >
            {totalSelected > 0
              ? <span className="text-[12px] font-bold leading-none">{totalSelected}</span>
              : <Plus className="size-4" />
            }
          </button>
        )}
      </div>
    </article>
  )
})

// ── FILA AGRUPADA EN EL CARRITO ───────────────────────────────────────────────
type CartGroup = {
  baseDesc: string
  title: string
  precio: number
  totalCantidad: number
  totalSubtotal: number
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
      g.items.push(item)
      if (item.opcion) g.hasOpciones = true
    } else {
      groups.set(baseDesc, {
        baseDesc, title, options,
        precio: item.product.precio,
        totalCantidad: item.cantidad,
        totalSubtotal: item.subtotal,
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
  onEditGroup: (group: CartGroup) => void
  onRemoveSingle: (desc: string, opcion?: string) => void
  onUpdateQuantity: (desc: string, opcion: string | undefined, cantidad: number) => void
}

const CartGroupRow = memo(function CartGroupRow({
  group, onRemoveGroup, onEditGroup, onRemoveSingle, onUpdateQuantity,
}: CartGroupRowProps) {
  const [localVal, setLocalVal] = useState(String(group.totalCantidad))
  useEffect(() => { setLocalVal(String(group.totalCantidad)) }, [group.totalCantidad])

  if (group.hasOpciones && group.options.length > 1) {
    const resumen = group.items
      .filter((i) => i.cantidad > 0)
      .map((i) => `${i.cantidad} ${i.opcion ?? ""}`)
      .join(", ")

    return (
      <div className="flex items-center gap-2 py-2.5 border-b border-white/8 last:border-b-0">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white truncate">
            {group.title}
            <span className="ml-1.5 text-[#555] font-normal text-[12px]">· {group.totalCantidad} u.</span>
          </p>
          <p className="text-[12px] text-[#555] truncate">{resumen}</p>
          <p className="text-[11px] text-[#444] tabular-nums">{formatCurrency(group.totalSubtotal)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEditGroup(group)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#1e1e20] text-[#888] active:opacity-60"
            aria-label="Editar"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemoveGroup(group.baseDesc)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#3a3a3a] hover:text-[#ff6b6b] active:opacity-60"
            aria-label="Eliminar"
          >
            <X className="size-3.5" />
          </button>
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
    <div className="flex items-center gap-2 py-2.5 border-b border-white/8 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white truncate">{group.title}</p>
        <p className="text-[11px] text-[#444] tabular-nums">
          {formatCurrency(group.totalSubtotal)}
          {group.totalCantidad > 1 && (
            <span className="ml-1">({group.totalCantidad} × {formatCurrency(group.precio)})</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => item.cantidad > 1 && onUpdateQuantity(item.product.descripcion, item.opcion, item.cantidad - 1)}
          disabled={item.cantidad <= 1}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border text-base font-bold",
            item.cantidad > 1
              ? "border-white/10 bg-[#1e1e20] text-white active:opacity-60"
              : "border-white/5 bg-[#161616] text-[#2a2a2a] cursor-not-allowed"
          )}
        >−</button>
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-8 w-12 rounded-lg border border-white/10 bg-[#1e1e20] text-center text-[13px] font-bold text-white outline-none focus:border-[#1976d2] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.product.descripcion, item.opcion, item.cantidad + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#1e1e20] text-base font-bold text-white active:opacity-60"
        >+</button>
        <button
          type="button"
          onClick={() => onRemoveSingle(item.product.descripcion, item.opcion)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#3a3a3a] hover:text-[#ff6b6b] active:opacity-60 ml-0.5"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
})

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export function ProductSelector({ products, items, onItemsChange }: ProductSelectorProps) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(true)
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_PRODUCTS)

  const [multiModal, setMultiModal] = useState<{
    open: boolean
    product: Product | null
    title: string
    options: string[]
  }>({ open: false, product: null, title: "", options: [] })

  const prevLengthRef = useRef(0)
  useEffect(() => {
    if (prevLengthRef.current === 0 && items.length > 0) setCartOpen(true)
    prevLengthRef.current = items.length
  }, [items.length])

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

  const totalByDesc = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      map.set(item.product.descripcion, (map.get(item.product.descripcion) ?? 0) + item.cantidad)
    }
    return map
  }, [items])

  const currentQtysByDesc = useMemo(() => {
    const map = new Map<string, Record<string, number>>()
    for (const item of items) {
      if (!map.has(item.product.descripcion)) map.set(item.product.descripcion, {})
      map.get(item.product.descripcion)![item.opcion ?? ""] = item.cantidad
    }
    return map
  }, [items])

  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])
  const cartGroups = useMemo(() => groupCartItems(items, derivedByDesc), [items, derivedByDesc])

  const openMultiModal = useCallback((product: Product) => {
    const d = derivedByDesc.get(product.descripcion)
    const options = d?.options ?? productOptions(product.descripcion)
    const title = d?.title ?? shortDesc(product.descripcion)
    setMultiModal({ open: true, product, title, options })
  }, [derivedByDesc])

  const handleMultiConfirm = useCallback((qtys: Record<string, number>) => {
    if (!multiModal.product) return
    const product = multiModal.product
    onItemsChange((prev) => {
      const rest = prev.filter((i) => i.product.descripcion !== product.descripcion)
      const newItems: LineItem[] = []
      for (const [opcion, cantidad] of Object.entries(qtys)) {
        if (cantidad > 0) {
          newItems.push({ product, cantidad, subtotal: cantidad * product.precio, opcion })
        }
      }
      return [...rest, ...newItems]
    })
    setMultiModal((prev) => ({ ...prev, open: false }))
  }, [multiModal.product, onItemsChange])

  const addItem = useCallback((product: Product, opcion?: string) => {
    const key = itemKey(product.descripcion, opcion)
    onItemsChange((prev) => {
      const idx = prev.findIndex((i) => itemKey(i.product.descripcion, i.opcion) === key)
      if (idx >= 0) {
        const next = prev.slice()
        const cur = next[idx]
        const cantidad = cur.cantidad + 1
        next[idx] = { ...cur, cantidad, subtotal: cantidad * cur.product.precio }
        return next
      }
      return [...prev, { product, cantidad: 1, subtotal: product.precio, opcion }]
    })
  }, [onItemsChange])

  const updateQuantity = useCallback((desc: string, opcion: string | undefined, cantidad: number) => {
    const key = itemKey(desc, opcion)
    onItemsChange((prev) => {
      const idx = prev.findIndex((i) => itemKey(i.product.descripcion, i.opcion) === key)
      if (idx < 0) return prev
      if (cantidad <= 0) return prev.filter((i) => itemKey(i.product.descripcion, i.opcion) !== key)
      const next = prev.slice()
      const cur = next[idx]
      if (cur.cantidad === cantidad) return prev
      next[idx] = { ...cur, cantidad, subtotal: cantidad * cur.product.precio }
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

  const editGroup = useCallback((group: CartGroup) => {
    if (group.options.length > 1) openMultiModal(group.items[0].product)
  }, [openMultiModal])

  useEffect(() => { setVisibleCount(MAX_VISIBLE_PRODUCTS) }, [deferredSearch, products])

  return (
    <>
      <MultiOptionModal
        open={multiModal.open}
        product={multiModal.product}
        title={multiModal.title}
        options={multiModal.options}
        currentQtys={multiModal.product ? (currentQtysByDesc.get(multiModal.product.descripcion) ?? {}) : {}}
        onConfirm={handleMultiConfirm}
        onClose={() => setMultiModal((prev) => ({ ...prev, open: false }))}
      />

      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-sm border-white/10 bg-[#1b1b1d] text-white">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-semibold text-white">Vaciar pedido</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[#888]">
            Se eliminan {items.length} {items.length === 1 ? "producto" : "productos"}.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmClearOpen(false)}
              className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-transparent text-[13px] font-medium text-white active:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => { onItemsChange([]); setConfirmClearOpen(false) }}
              className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[#ff3b3b] text-[13px] font-semibold text-white active:opacity-80"
            >
              Vaciar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3">

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#444]" />
          <input
            type="search"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-[#1a1a1c] pl-10 pr-4 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-white/20"
          />
        </div>

        {items.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#161616] overflow-hidden">
            <button
              type="button"
              onClick={() => setCartOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left active:opacity-70"
            >
              <div className="flex items-center gap-2">
                {cartOpen
                  ? <ChevronUp className="size-3.5 text-[#555]" />
                  : <ChevronDown className="size-3.5 text-[#555]" />
                }
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#555]">
                  Pedido · {cartGroups.length} {cartGroups.length === 1 ? "producto" : "productos"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-white tabular-nums">
                  {formatCurrency(total)}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmClearOpen(true) }}
                  className="flex items-center text-[#ff5555] active:opacity-60"
                  aria-label="Vaciar pedido"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </button>

            {cartOpen && (
              <div className="border-t border-white/8 px-3">
                {cartGroups.map((group) => (
                  <CartGroupRow
                    key={group.baseDesc}
                    group={group}
                    onRemoveGroup={removeGroup}
                    onEditGroup={editGroup}
                    onRemoveSingle={removeItem}
                    onUpdateQuantity={updateQuantity}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-white/8 bg-[#141414] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#444]">Productos</p>
            <p className="text-[11px] text-[#333]">{filtered.length} disponibles</p>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Package2 className="size-6 text-[#2a2a2a]" />
              <p className="text-sm text-[#444]">No hay productos cargados</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Search className="size-6 text-[#2a2a2a]" />
              <p className="text-sm text-[#444]">Sin resultados para "{search}"</p>
            </div>
          ) : (
            <div className="px-3">
              {visibleProducts.map((p) => {
                const d = derivedByDesc.get(p.descripcion)
                const title = d?.title ?? shortDesc(p.descripcion)
                const options = d?.options ?? productOptions(p.descripcion)
                const infoTags = d?.tags ?? detailTags(p.descripcion)
                const totalSelected = totalByDesc.get(p.descripcion) ?? 0

                return (
                  <ProductRow
                    key={p.descripcion}
                    product={p}
                    title={title}
                    infoTags={infoTags}
                    options={options}
                    totalSelected={totalSelected}
                    onAdd={addItem}
                    onOpenMulti={openMultiModal}
                  />
                )
              })}
            </div>
          )}

          {filtered.length > visibleCount && (
            <div className="px-3 pb-3 pt-1">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + MAX_VISIBLE_PRODUCTS)}
                className="w-full rounded-xl border border-white/8 bg-[#1a1a1c] py-2.5 text-sm text-[#666] active:opacity-60"
              >
                Ver {filtered.length - visibleCount} más
              </button>
            </div>
          )}
        </div>

      </div>
    </>
  )
}