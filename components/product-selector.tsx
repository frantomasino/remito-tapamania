"use client"

import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2, Search, Package2, X, ChevronDown, ChevronUp } from "lucide-react"
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

// ── FILA DE PRODUCTO ──────────────────────────────────────────────────────────
interface ProductRowProps {
  product: Product
  title: string
  infoTags: string[]
  options: string[]
  selectedOpt: string
  selectedCount: number
  onSelectOption: (desc: string, opt: string) => void
  onAdd: (product: Product, opcion?: string) => void
}

const ProductRow = memo(function ProductRow({
  product, title, infoTags, options, selectedOpt, selectedCount, onSelectOption, onAdd,
}: ProductRowProps) {
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
            <div className="mt-1.5 flex flex-wrap gap-1">
              {options.map((o) => {
                const active = normalize(o) === normalize(selectedOpt)
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => onSelectOption(product.descripcion, o)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                      active ? "bg-[#1976d2] text-white" : "bg-[#222] text-[#777] ring-1 ring-white/8"
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
                <span key={t} className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[11px] text-[#555]">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAdd(product, selectedOpt || undefined)}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors active:opacity-60",
            selectedCount > 0
              ? "border-[#1976d2]/40 bg-[#1976d2]/15 text-[#60aaff]"
              : "border-white/10 bg-[#1e1e20] text-white"
          )}
        >
          {selectedCount > 0
            ? <span className="text-[12px] font-bold leading-none">{selectedCount}</span>
            : <Plus className="size-4" />
          }
        </button>
      </div>
    </article>
  )
})

// ── FILA EN EL CARRITO ────────────────────────────────────────────────────────
interface CartItemRowProps {
  item: LineItem
  title: string
  onRemove: (desc: string, opcion?: string) => void
  onUpdateQuantity: (desc: string, opcion: string | undefined, cantidad: number) => void
}

const CartItemRow = memo(function CartItemRow({ item, title, onRemove, onUpdateQuantity }: CartItemRowProps) {
  const [localValue, setLocalValue] = useState(String(item.cantidad))

  useEffect(() => { setLocalValue(String(item.cantidad)) }, [item.cantidad])

  const handleBlur = () => {
    const parsed = parseInt(localValue, 10)
    if (!isNaN(parsed) && parsed > 0) onUpdateQuantity(item.product.descripcion, item.opcion, parsed)
    else setLocalValue(String(item.cantidad))
  }

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-white/8 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white truncate">
          {title}
          {item.opcion ? <span className="text-[#555]"> · {item.opcion}</span> : null}
        </p>
        <p className="text-[12px] text-[#555] tabular-nums">
          {formatCurrency(item.subtotal)}
          {item.cantidad > 1 && (
            <span className="ml-1.5 text-[#444]">
              ({item.cantidad} × {formatCurrency(item.product.precio)})
            </span>
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
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
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
          onClick={() => onRemove(item.product.descripcion, item.opcion)}
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
  const [selectedOptionByDesc, setSelectedOptionByDesc] = useState<Record<string, string>>({})
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_PRODUCTS)

  const prevLengthRef = useRef(0)
  useEffect(() => {
    if (prevLengthRef.current === 0 && items.length > 0) setCartOpen(true)
    prevLengthRef.current = items.length
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

  useEffect(() => { setVisibleCount(MAX_VISIBLE_PRODUCTS) }, [deferredSearch, products])

  return (
    <>
      {/* ── MODAL VACIAR — botones nativos compactos ── */}
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

        {/* ── BUSCADOR ── */}
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

        {/* ── CARRITO — colapsable ── */}
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
                  Pedido · {items.length} {items.length === 1 ? "ítem" : "ítems"}
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
                {items.map((item) => {
                  const d = derivedByDesc.get(item.product.descripcion)
                  const title = d?.title ?? shortDesc(item.product.descripcion)
                  return (
                    <CartItemRow
                      key={itemKey(item.product.descripcion, item.opcion)}
                      item={item}
                      title={title}
                      onRemove={removeItem}
                      onUpdateQuantity={updateQuantity}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LISTA DE PRODUCTOS ── */}
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
                const selectedOpt = options.length > 0 ? (getSelectedOpt(p.descripcion) || options[0]) : ""
                const selectedCount = options.length > 0
                  ? itemCountByKey.get(itemKey(p.descripcion, selectedOpt)) ?? 0
                  : itemCountByKey.get(itemKey(p.descripcion)) ?? 0

                return (
                  <ProductRow
                    key={itemKey(p.descripcion)}
                    product={p}
                    title={title}
                    infoTags={infoTags}
                    options={options}
                    selectedOpt={selectedOpt}
                    selectedCount={selectedCount}
                    onSelectOption={setSelectedOpt}
                    onAdd={addItem}
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