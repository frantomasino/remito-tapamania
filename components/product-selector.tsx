"use client"

import type React from "react"
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Plus, Trash2, Search, Package2 } from "lucide-react"
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
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

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
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className="border-b border-border py-3 last:border-b-0"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground">
            {title}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-foreground tabular-nums">
              {formatCurrency(product.precio)}
            </p>

            {selectedCount > 0 ? (
              <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                {selectedCount} agregado{selectedCount > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          {options.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {options.map((o) => {
                const active = normalize(o) === normalize(selectedOpt)
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => onSelectOption(product.descripcion, o)}
                    className={cn(
                      "min-h-[34px] rounded-full px-3 py-1.5 text-[11px] font-medium leading-none transition-colors ring-1",
                      active
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-background text-foreground ring-border"
                    )}
                  >
                    {o}
                  </button>
                )
              })}
            </div>
          ) : infoTags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {infoTags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-background px-3 py-1.5 text-[11px] font-medium leading-none text-muted-foreground ring-1 ring-border"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <Button
          onClick={() => onAdd(product, selectedOpt || undefined)}
          className="h-11 shrink-0 rounded-2xl px-4 text-[13px] font-medium shadow-sm"
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
    </motion.article>
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

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className="border-b border-border py-3 last:border-b-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground">
            {title}
            {item.opcion ? (
              <span className="font-medium text-muted-foreground"> — {item.opcion}</span>
            ) : null}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-[13px] text-muted-foreground">
              Unitario: {formatCurrency(item.product.precio)}
            </p>
            <p className="text-[15px] font-semibold text-foreground tabular-nums">
              {formatCurrency(item.subtotal)}
            </p>
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
                "flex h-10 w-10 items-center justify-center rounded-xl text-base font-semibold transition-colors ring-1 ring-border",
                canDecrease
                  ? "bg-background text-foreground"
                  : "cursor-not-allowed bg-accent text-muted-foreground"
              )}
              aria-label="Restar cantidad"
            >
              −
            </button>

            <div className="flex min-w-[44px] items-center justify-center rounded-xl bg-background px-3 py-2 text-[14px] font-semibold tabular-nums text-foreground ring-1 ring-border">
              {item.cantidad}
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateQuantity(item.product.descripcion, item.opcion, item.cantidad + 1)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-base font-semibold text-foreground transition-colors ring-1 ring-border"
              aria-label="Sumar cantidad"
            >
              +
            </button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.product.descripcion, item.opcion)}
          aria-label="Eliminar"
          className="mt-0.5 h-10 w-10 rounded-2xl"
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </motion.article>
  )
})

export function ProductSelector({ products, items, onItemsChange }: ProductSelectorProps) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [mobileTab, setMobileTab] = useState<"catalogo" | "seleccionados">("catalogo")
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [selectedOptionByDesc, setSelectedOptionByDesc] = useState<Record<string, string>>({})
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_PRODUCTS)

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

  const itemCountByDesc = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      map.set(item.product.descripcion, (map.get(item.product.descripcion) ?? 0) + item.cantidad)
    }
    return map
  }, [items])

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

  const onAskClearAll = useCallback(() => {
    if (items.length === 0) return
    setConfirmClearOpen(true)
  }, [items.length])

  const onConfirmClearAll = useCallback(() => {
    clearAllSelected()
    setConfirmClearOpen(false)
    setMobileTab("catalogo")
  }, [clearAllSelected])

  useEffect(() => {
    setVisibleCount(MAX_VISIBLE_PRODUCTS)
  }, [deferredSearch, products])

  return (
    <>
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Vaciar selección</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Se van a eliminar {items.length} {items.length === 1 ? "producto" : "productos"}.
          </p>

          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-2xl"
              onClick={() => setConfirmClearOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="h-11 flex-1 rounded-2xl"
              onClick={onConfirmClearAll}
            >
              Vaciar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4 overflow-x-hidden">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-accent p-1 ring-1 ring-border">
          <button
            type="button"
            onClick={() => setMobileTab("catalogo")}
            className={cn(
              "h-11 rounded-xl text-[13px] font-medium transition-colors",
              mobileTab === "catalogo"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Catálogo
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("seleccionados")}
            className={cn(
              "h-11 rounded-xl text-[13px] font-medium transition-colors",
              mobileTab === "seleccionados"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Seleccionados ({items.length})
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mobileTab === "catalogo" ? (
            <motion.div
              key="catalogo"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="flex flex-col gap-3"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 rounded-2xl bg-background pl-10 text-[14px] shadow-none ring-1 ring-border"
                />
              </div>

              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl bg-background px-4 py-10 text-center ring-1 ring-border">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-accent">
                    <Package2 className="size-5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">No hay productos cargados</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Revisá la lista de precios seleccionada.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl bg-background px-4 py-10 text-center ring-1 ring-border">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-accent">
                    <Search className="size-5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">No encontramos productos</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Probá con otro nombre o una palabra más corta.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl bg-background px-4 py-1 ring-1 ring-border">
                  {visibleProducts.map((p) => {
                    const d = derivedByDesc.get(p.descripcion)
                    const title = d?.title ?? shortDesc(p.descripcion)
                    const options = d?.options ?? productOptions(p.descripcion)
                    const infoTags = d?.tags ?? detailTags(p.descripcion)
                    const selectedOpt = options.length > 0 ? (getSelectedOpt(p.descripcion) || options[0]) : ""

                    const selectedCount =
                      options.length > 0
                        ? itemCountByKey.get(itemKey(p.descripcion, selectedOpt)) ?? 0
                        : itemCountByDesc.get(p.descripcion) ?? 0

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
                  className="h-11 rounded-2xl"
                >
                  Ver más ({filtered.length - visibleCount})
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="seleccionados"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="flex flex-col gap-3"
            >
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Pedido actual
                </p>
                <p className="mt-1 text-[15px] font-semibold text-foreground">
                  {items.length} {items.length === 1 ? "producto" : "productos"}
                </p>
              </div>

              {items.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAskClearAll}
                  className="h-10 w-fit rounded-2xl px-3 text-[13px]"
                >
                  <Trash2 className="size-4" />
                  Vaciar selección
                </Button>
              ) : null}

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl bg-background px-4 py-10 text-center ring-1 ring-border">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-accent">
                    <Package2 className="size-5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">Todavía no agregaste productos</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Sumalos desde la pestaña de catálogo.
                  </p>
                </div>
              ) : (
                <motion.div layout className="rounded-3xl bg-background px-4 py-1 ring-1 ring-border">
                  <AnimatePresence initial={false}>
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
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}