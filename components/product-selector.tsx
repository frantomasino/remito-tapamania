"use client"

import type React from "react"
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Plus,
  Trash2,
  Search,
  Package2,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { type Product, type LineItem, formatCurrency } from "@/lib/remito-types"

interface ProductSelectorProps {
  products: Product[]
  items: LineItem[]
  onItemsChange: React.Dispatch<React.SetStateAction<LineItem[]>>
}

const MAX_VISIBLE_PRODUCTS = 40

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
  const raw = parts
    .flatMap((p) => p.split(","))
    .map((x) => x.trim())
    .filter(Boolean)

  const mapped = raw.map((t) => {
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

  if (/#promo/i.test(s)) {
    out.push("Promo")
    seen.add("promo")
  }

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
    "horno",
    "freir",
    "criolla",
    "ricota",
    "verdura",
    "pollo",
    "r/v",
    "r/j",
    "p/v",
    "4 quesos",
    "cuatro quesos",
    "mozzarella",
    "jamon",
    "nuez",
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

type Derived = {
  title: string
  tags: string[]
  options: string[]
  haystack: string
}

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
  product,
  title,
  infoTags,
  options,
  selectedOpt,
  selectedCount,
  onSelectOption,
  onAdd,
}: ProductRowProps) {
  return (
    <article className="border-b border-white/10 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-5 text-white">{title}</p>

          {options.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {options.map((o) => {
                const active = normalize(o) === normalize(selectedOpt)

                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => onSelectOption(product.descripcion, o)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                      active
                        ? "bg-[#1f6fbe] text-white"
                        : "bg-[#2a2a2d] text-[#d2d2d4] ring-1 ring-white/10"
                    )}
                  >
                    {o}
                  </button>
                )
              })}
            </div>
          ) : infoTags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {infoTags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-[#2a2a2d] px-2.5 py-1 text-[11px] font-medium text-[#c8c8cc] ring-1 ring-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          <p className="mt-2 text-[22px] font-bold leading-none tracking-tight text-white">
            {formatCurrency(product.precio)}
          </p>
        </div>

        <div className="relative shrink-0 pt-1">
          {selectedCount > 0 && (
            <span className="absolute -right-1 -top-1 z-10 rounded-full bg-[#ff5a5f] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow">
              x{selectedCount}
            </span>
          )}

          <button
            type="button"
            onClick={() => onAdd(product, selectedOpt || undefined)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-transparent px-4 text-sm font-semibold text-white transition-colors hover:bg-white/5"
          >
            <Plus className="size-4" />
            Agregar
          </button>
        </div>
      </div>
    </article>
  )
})

interface SelectedItemRowProps {
  item: LineItem
  title: string
  onRemove: (desc: string, opcion?: string) => void
  onUpdateQuantity: (desc: string, opcion: string | undefined, cantidad: number) => void
}

const SelectedItemRow = memo(function SelectedItemRow({
  item,
  title,
  onRemove,
  onUpdateQuantity,
}: SelectedItemRowProps) {
  const canDecrease = item.cantidad > 1
  const showBothPrices = item.cantidad > 1

  return (
    <article className="border-b border-white/10 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {title}
            {item.opcion ? <span className="text-[#b0b0b6]"> · {item.opcion}</span> : null}
          </p>

          <div className="mt-1 flex items-center gap-3">
            {showBothPrices ? (
              <>
                <p className="text-sm text-[#9e9ea6]">
                  {item.cantidad} x {formatCurrency(item.product.precio)}
                </p>
                <p className="text-base font-semibold text-white">
                  {formatCurrency(item.subtotal)}
                </p>
              </>
            ) : (
              <p className="text-base font-semibold text-white">
                {formatCurrency(item.subtotal)}
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                canDecrease &&
                onUpdateQuantity(item.product.descripcion, item.opcion, item.cantidad - 1)
              }
              disabled={!canDecrease}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border text-base font-semibold",
                canDecrease
                  ? "border-white/15 bg-[#232326] text-white"
                  : "cursor-not-allowed border-white/10 bg-[#1b1b1d] text-[#666]"
              )}
            >
              −
            </button>

            <div className="flex min-w-[40px] items-center justify-center rounded-xl border border-white/15 bg-[#232326] px-3 py-2 text-sm font-semibold text-white">
              {item.cantidad}
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateQuantity(item.product.descripcion, item.opcion, item.cantidad + 1)
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-[#232326] text-base font-semibold text-white"
            >
              +
            </button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.product.descripcion, item.opcion)}
          className="text-[#ff6b6b] hover:bg-white/5 hover:text-[#ff6b6b]"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </article>
  )
})

export function ProductSelector({ products, items, onItemsChange }: ProductSelectorProps) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [selectedOptionByDesc, setSelectedOptionByDesc] = useState<Record<string, string>>({})
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_PRODUCTS)
  const [showSelected, setShowSelected] = useState(false)

  const getSelectedOpt = useCallback(
    (desc: string) => selectedOptionByDesc[desc] ?? "",
    [selectedOptionByDesc]
  )

  const setSelectedOpt = useCallback((desc: string, opt: string) => {
    setSelectedOptionByDesc((prev) => (prev[desc] === opt ? prev : { ...prev, [desc]: opt }))
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

  const totalUnits = useMemo(() => items.reduce((acc, item) => acc + item.cantidad, 0), [items])
  const totalAmount = useMemo(() => items.reduce((acc, item) => acc + item.subtotal, 0), [items])

  const addItem = useCallback(
    (product: Product, opcion?: string) => {
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
    },
    [onItemsChange]
  )

  const updateQuantity = useCallback(
    (desc: string, opcion: string | undefined, cantidad: number) => {
      const key = itemKey(desc, opcion)

      onItemsChange((prev) => {
        const idx = prev.findIndex((i) => itemKey(i.product.descripcion, i.opcion) === key)
        if (idx < 0) return prev

        if (cantidad <= 0) {
          return prev.filter((i) => itemKey(i.product.descripcion, i.opcion) !== key)
        }

        const next = prev.slice()
        const cur = next[idx]
        if (cur.cantidad === cantidad) return prev

        next[idx] = { ...cur, cantidad, subtotal: cantidad * cur.product.precio }
        return next
      })
    },
    [onItemsChange]
  )

  const removeItem = useCallback(
    (desc: string, opcion?: string) => {
      const key = itemKey(desc, opcion)
      onItemsChange((prev) => prev.filter((i) => itemKey(i.product.descripcion, i.opcion) !== key))
    },
    [onItemsChange]
  )

  const clearAllSelected = useCallback(() => {
    onItemsChange([])
  }, [onItemsChange])

  useEffect(() => {
    setVisibleCount(MAX_VISIBLE_PRODUCTS)
  }, [deferredSearch, products])

  return (
    <>
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-sm border-white/10 bg-[#1b1b1d] text-white">
          <DialogHeader>
            <DialogTitle>Vaciar selección</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-[#b0b0b6]">
            Se van a eliminar {items.length} {items.length === 1 ? "producto" : "productos"}.
          </p>

          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmClearOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => {
              clearAllSelected()
              setConfirmClearOpen(false)
              setShowSelected(false)
            }}>
              Vaciar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8f8f95]" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-xl border-white/10 bg-[#1a1a1c] pl-10 text-white placeholder:text-[#8f8f95]"
          />
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#242426] px-3 py-3 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
          <button
            type="button"
            onClick={() => setShowSelected((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#1976d2] text-white">
                <ShoppingBag className="size-4" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Pedido actual</p>
                <p className="text-xs text-[#b0b0b6]">
                  {items.length} productos · {totalUnits} unidades
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[11px] font-medium text-[#a2a2a8]">Subtotal</p>
                <p className="text-[22px] font-bold leading-none text-white">
                  {formatCurrency(totalAmount)}
                </p>
              </div>

              {showSelected ? (
                <ChevronUp className="size-4 text-[#b0b0b6]" />
              ) : (
                <ChevronDown className="size-4 text-[#b0b0b6]" />
              )}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {showSelected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-3 border-t border-white/10 pt-2">
                  {items.length > 0 ? (
                    <>
                      <div className="mb-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmClearOpen(true)}
                          className="text-[#b0b0b6] hover:bg-white/5 hover:text-white"
                        >
                          <Trash2 className="size-4" />
                          Vaciar
                        </Button>
                      </div>

                      {items.map((item) => {
                        const d = derivedByDesc.get(item.product.descripcion)
                        const title = d?.title ?? shortDesc(item.product.descripcion)

                        return (
                          <SelectedItemRow
                            key={itemKey(item.product.descripcion, item.opcion)}
                            item={item}
                            title={title}
                            onRemove={removeItem}
                            onUpdateQuantity={updateQuantity}
                          />
                        )
                      })}
                    </>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm font-medium text-white">Todavía no agregaste productos</p>
                      <p className="mt-1 text-xs text-[#9e9ea6]">
                        Sumalos desde la lista de abajo.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="rounded-2xl bg-transparent">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#d6d6da]">
              Productos
            </h3>
            <p className="text-xs font-medium text-[#b0b0b6]">
              {filtered.length} disponibles
            </p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#1a1a1c] py-8 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-[#232326] text-[#9e9ea6]">
                <Package2 className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-white">No hay productos cargados</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#1a1a1c] py-8 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-[#232326] text-[#9e9ea6]">
                <Search className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-white">No encontramos productos</p>
            </div>
          ) : (
            <div>
              {visibleProducts.map((p) => {
                const d = derivedByDesc.get(p.descripcion)
                const title = d?.title ?? shortDesc(p.descripcion)
                const options = d?.options ?? productOptions(p.descripcion)
                const infoTags = d?.tags ?? detailTags(p.descripcion)
                const selectedOpt = options.length > 0 ? (getSelectedOpt(p.descripcion) || options[0]) : ""

                const selectedCount =
                  options.length > 0
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
            <Button
              variant="outline"
              onClick={() => setVisibleCount((prev) => prev + MAX_VISIBLE_PRODUCTS)}
              className="mt-4 w-full border-white/10 bg-[#1a1a1c] text-white hover:bg-white/5"
            >
              Ver más ({filtered.length - visibleCount})
            </Button>
          )}
        </section>
      </div>
    </>
  )
}