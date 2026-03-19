"use client"

import type React from "react"
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Search, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type Product, type LineItem, formatCurrency } from "@/lib/remito-types"

interface ProductSelectorProps {
  products: Product[]
  items: LineItem[]
  onItemsChange: React.Dispatch<React.SetStateAction<LineItem[]>>
}

const MAX_VISIBLE_PRODUCTS = 50

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

  return out.slice(0, 4)
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

interface ProductCardProps {
  product: Product
  title: string
  infoTags: string[]
  options: string[]
  selectedOpt: string
  onSelectOption: (desc: string, opt: string) => void
  onAdd: (product: Product, opcion?: string) => void
}

const ProductCard = memo(function ProductCard({
  product,
  title,
  infoTags,
  options,
  selectedOpt,
  onSelectOption,
  onAdd,
}: ProductCardProps) {
  return (
    <article className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-snug break-words">{title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{formatCurrency(product.precio)}</span>
          </p>
        </div>

        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      </div>

      {options.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {options.map((o) => {
            const active = normalize(o) === normalize(selectedOpt)
            return (
              <button
                key={o}
                type="button"
                onClick={() => onSelectOption(product.descripcion, o)}
                className={`rounded-full border px-2 py-0.5 text-[10px] ${
                  active ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40"
                }`}
              >
                {o}
              </button>
            )
          })}
        </div>
      ) : infoTags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {infoTags.map((t) => (
            <span key={t} className="rounded-full border bg-muted/40 px-2 py-0.5 text-[10px]">
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3">
        <Button className="h-9 w-full text-[12px]" onClick={() => onAdd(product, selectedOpt || undefined)}>
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
    </article>
  )
})

interface SelectedItemCardProps {
  item: LineItem
  title: string
  qtyOptions: number[]
  onRemove: (desc: string, opcion?: string) => void
  onUpdateQuantity: (desc: string, opcion: string | undefined, cantidad: number) => void
}

const SelectedItemCard = memo(function SelectedItemCard({
  item,
  title,
  qtyOptions,
  onRemove,
  onUpdateQuantity,
}: SelectedItemCardProps) {
  return (
    <article className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-snug break-words">
            {title}
            {item.opcion ? <span className="text-muted-foreground"> — {item.opcion}</span> : null}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatCurrency(item.product.precio)}</p>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(item.product.descripcion, item.opcion)}
          aria-label="Eliminar"
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] text-muted-foreground">Cantidad</p>
          <select
            className="h-9 rounded-md border bg-background px-3 text-[12px]"
            value={item.cantidad}
            onChange={(e) =>
              onUpdateQuantity(item.product.descripcion, item.opcion, Number(e.target.value))
            }
          >
            {qtyOptions.map((qty) => (
              <option key={qty} value={qty}>
                {qty}
              </option>
            ))}
          </select>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Subtotal</p>
          <p className="text-[12px] font-bold">{formatCurrency(item.subtotal)}</p>
        </div>
      </div>
    </article>
  )
})

export function ProductSelector({ products, items, onItemsChange }: ProductSelectorProps) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [mobileTab, setMobileTab] = useState<"catalogo" | "seleccionados">("catalogo")
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [selectedOptionByDesc, setSelectedOptionByDesc] = useState<Record<string, string>>({})
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_PRODUCTS)

  const qtyOptions = useMemo(() => Array.from({ length: 100 }, (_, i) => i + 1), [])

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

  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])

  useEffect(() => {
    setVisibleCount(MAX_VISIBLE_PRODUCTS)
  }, [deferredSearch, products])

  return (
    <>
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>¿Vaciar selección?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Vas a eliminar <span className="font-semibold text-foreground">{items.length}</span> producto(s).
          </p>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmClearOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={onConfirmClearAll}>
              Vaciar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4 overflow-x-hidden">
        <div>
          <div className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-2">
            <button
              type="button"
              onClick={() => setMobileTab("catalogo")}
              className={`h-10 rounded-lg text-sm font-semibold ${
                mobileTab === "catalogo" ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("seleccionados")}
              className={`h-10 rounded-lg text-sm font-semibold ${
                mobileTab === "seleccionados" ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              Seleccionados ({items.length})
            </button>
          </div>
        </div>

        <div className={mobileTab === "seleccionados" ? "hidden" : "flex flex-col gap-3"}>
          <Label>Catálogo de productos</Label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {products.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
              <p className="text-sm text-muted-foreground">No hay productos cargados</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
              <p className="text-sm text-muted-foreground">No se encontraron productos</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleProducts.map((p) => {
                const d = derivedByDesc.get(p.descripcion)
                const title = d?.title ?? shortDesc(p.descripcion)
                const options = d?.options ?? productOptions(p.descripcion)
                const infoTags = d?.tags ?? detailTags(p.descripcion)
                const selectedOpt = options.length > 0 ? (getSelectedOpt(p.descripcion) || options[0]) : ""

                return (
                  <ProductCard
                    key={itemKey(p.descripcion)}
                    product={p}
                    title={title}
                    infoTags={infoTags}
                    options={options}
                    selectedOpt={selectedOpt}
                    onSelectOption={setSelectedOpt}
                    onAdd={addItem}
                  />
                )
              })}

              {filtered.length > visibleCount && (
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + MAX_VISIBLE_PRODUCTS)}
                  className="mt-2"
                >
                  Ver más ({filtered.length - visibleCount} restantes)
                </Button>
              )}
            </div>
          )}
        </div>

        <div className={mobileTab === "catalogo" ? "hidden" : "flex flex-col gap-3"}>
          <div className="flex items-center justify-between gap-2">
            <Label>Seleccionados ({items.length})</Label>

            <Button variant="outline" size="sm" onClick={onAskClearAll} disabled={items.length === 0}>
              <Trash2 className="size-4" />
              Vaciar
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
              <p className="text-sm text-muted-foreground">No hay productos seleccionados</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => {
                const d = derivedByDesc.get(item.product.descripcion)
                const title = d?.title ?? shortDesc(item.product.descripcion)

                return (
                  <SelectedItemCard
                    key={itemKey(item.product.descripcion, item.opcion)}
                    item={item}
                    title={title}
                    qtyOptions={qtyOptions}
                    onRemove={removeItem}
                    onUpdateQuantity={updateQuantity}
                  />
                )
              })}

              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[13px] font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}