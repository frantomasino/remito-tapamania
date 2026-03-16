"use client"

import type React from "react"
import { useCallback, useDeferredValue, useMemo, useState } from "react"
import { Plus, Trash2, Search, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type Product, type LineItem, formatCurrency } from "@/lib/remito-types"

interface ProductSelectorProps {
  products: Product[]
  items: LineItem[]
  onItemsChange: React.Dispatch<React.SetStateAction<LineItem[]>>
}

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

type Derived = { title: string; tags: string[]; haystack: string }

export function ProductSelector({ products, items, onItemsChange }: ProductSelectorProps) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)

  // ✅ Mobile tabs
  const [mobileTab, setMobileTab] = useState<"catalogo" | "seleccionados">("catalogo")

  // ✅ confirm dialog
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  // qty por producto+opcion (en catálogo)
  const [addQty, setAddQty] = useState<Record<string, number>>({})
  // opcion elegida por producto (solo para móvil)
  const [selectedOptionByDesc, setSelectedOptionByDesc] = useState<Record<string, string>>({})

  const qtyOptions = useMemo(() => Array.from({ length: 100 }, (_, i) => i + 1), [])

  const getQty = useCallback((key: string) => addQty[key] ?? 1, [addQty])
  const setQty = useCallback((key: string, qty: number) => {
    setAddQty((prev) => (prev[key] === qty ? prev : { ...prev, [key]: qty }))
  }, [])

  const getSelectedOpt = useCallback((desc: string) => selectedOptionByDesc[desc] ?? "", [selectedOptionByDesc])
  const setSelectedOpt = useCallback((desc: string, opt: string) => {
    setSelectedOptionByDesc((prev) => (prev[desc] === opt ? prev : { ...prev, [desc]: opt }))
  }, [])

  const itemsByKey = useMemo(() => {
    const m = new Map<string, LineItem>()
    for (const it of items) m.set(itemKey(it.product.descripcion, it.opcion), it)
    return m
  }, [items])

  const derivedByDesc = useMemo(() => {
    const m = new Map<string, Derived>()
    for (const p of products) {
      const title = shortDesc(p.descripcion)
      const tags = detailTags(p.descripcion)
      const haystack = normalize(`${p.descripcion}`)
      m.set(p.descripcion, { title, tags, haystack })
    }
    return m
  }, [products])

  const filtered = useMemo(() => {
    const q = normalize(deferredSearch.trim())
    if (!q) return products
    return products.filter((p) => (derivedByDesc.get(p.descripcion)?.haystack ?? "").includes(q))
  }, [products, deferredSearch, derivedByDesc])

  const addItemWithQty = useCallback(
    (product: Product, qty: number, opcion?: string) => {
      const q = Math.min(100, Math.max(1, qty || 1))
      const key = itemKey(product.descripcion, opcion)

      onItemsChange((prev) => {
        const idx = prev.findIndex((i) => itemKey(i.product.descripcion, i.opcion) === key)

        if (idx >= 0) {
          const next = prev.slice()
          const cur = next[idx]
          const cantidad = cur.cantidad + q
          next[idx] = { ...cur, cantidad, subtotal: cantidad * cur.product.precio }
          return next
        }

        return [...prev, { product, cantidad: q, subtotal: q * product.precio, opcion }]
      })

      setQty(key, 1)
      // ✅ NO cambiamos de tab: se queda en Catálogo
    },
    [onItemsChange, setQty]
  )

  const updateQuantity = useCallback(
    (desc: string, opcion: string | undefined, cantidad: number) => {
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

  const dec = useCallback(
    (desc: string, opcion?: string) => {
      const it = itemsByKey.get(itemKey(desc, opcion))
      if (!it) return
      updateQuantity(desc, opcion, it.cantidad - 1)
    },
    [itemsByKey, updateQuantity]
  )

  const inc = useCallback(
    (desc: string, opcion?: string) => {
      const it = itemsByKey.get(itemKey(desc, opcion))
      if (!it) return
      updateQuantity(desc, opcion, it.cantidad + 1)
    },
    [itemsByKey, updateQuantity]
  )

  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])

  return (
    <>
      {/* ✅ Dialog confirm (pro) */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>¿Vaciar selección?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Vas a eliminar <span className="font-semibold text-foreground">{items.length}</span> producto(s) del remito.
            Esta acción no se puede deshacer.
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
        {/* ✅ Mobile Tabs */}
        <div className="sm:hidden">
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

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 overflow-x-hidden">
          {/* ======================= CATÁLOGO ======================= */}
          <div className={`flex flex-col gap-3 flex-1 min-w-0 ${mobileTab === "seleccionados" ? "hidden sm:flex" : ""}`}>
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
            ) : (
              <>
                {/* ✅ MÓVIL */}
                <div className="sm:hidden flex flex-col gap-2 min-w-0">
                  {filtered.map((p, idx) => {
                    const d = derivedByDesc.get(p.descripcion)
                    const title = d?.title ?? shortDesc(p.descripcion)
                    const opts = productOptions(p.descripcion)
                    const infoTags = d?.tags ?? detailTags(p.descripcion)

                    const selectedOpt = opts.length > 0 ? (getSelectedOpt(p.descripcion) || opts[0]) : ""
                    const keyForQty = itemKey(p.descripcion, selectedOpt || undefined)
                    const qty = getQty(keyForQty)

                    return (
                      <div key={`${p.descripcion}-${idx}`} className="rounded-lg border p-3 overflow-x-hidden">
                        <p className="text-[12px] font-semibold leading-snug break-words">{title}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{formatCurrency(p.precio)}</span>
                        </p>

                        {opts.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {opts.map((o) => {
                              const active = normalize(o) === normalize(selectedOpt)
                              return (
                                <button
                                  key={o}
                                  type="button"
                                  onClick={() => setSelectedOpt(p.descripcion, o)}
                                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                    active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40"
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
                              <span key={t} className="rounded-full border px-2 py-0.5 text-[10px] bg-muted/40">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-3 flex items-center gap-2 min-w-0">
                          <div className="w-20 flex-shrink-0">
                            <Select value={String(qty)} onValueChange={(v) => setQty(keyForQty, Number(v))}>
                              <SelectTrigger className="h-8 w-full px-2 text-[12px]">
                                <SelectValue placeholder="Cant." />
                              </SelectTrigger>
                              <SelectContent className="max-h-72 w-[var(--radix-select-trigger-width)]">
                                {qtyOptions.map((n) => (
                                  <SelectItem key={n} value={String(n)} className="text-[12px]">
                                    {n}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            className="h-8 flex-1 px-3 text-[12px]"
                            onClick={() => addItemWithQty(p, qty, selectedOpt || undefined)}
                          >
                            <Plus className="size-4" />
                            Agregar
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ✅ DESKTOP */}
                <div className="hidden sm:block max-h-64 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Descripción</TableHead>
                        <TableHead className="text-xs text-right">Precio</TableHead>
                        <TableHead className="text-xs w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p, idx) => {
                        const d = derivedByDesc.get(p.descripcion)
                        const title = d?.title ?? shortDesc(p.descripcion)
                        const tags = d?.tags ?? detailTags(p.descripcion)
                        const opts = productOptions(p.descripcion)
                        const defaultOpt = opts.length > 0 ? opts[0] : undefined

                        return (
                          <TableRow key={`${p.descripcion}-${idx}`}>
                            <TableCell className="text-xs">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{title}</span>
                                {tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {tags.map((t) => (
                                      <span key={t} className="rounded-full border px-2 py-0.5 text-[11px] bg-muted/40">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium">{formatCurrency(p.precio)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => addItemWithQty(p, 1, defaultOpt)}
                                aria-label={`Agregar ${title}`}
                              >
                                <Plus className="size-4 text-primary" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          {/* ======================= SELECCIONADOS ======================= */}
          <div className={`flex flex-col gap-3 flex-1 min-w-0 ${mobileTab === "catalogo" ? "hidden sm:flex" : ""}`}>
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
              <>
                {/* ✅ MOBILE */}
                <div className="sm:hidden flex flex-col gap-2 min-w-0">
                  {items.map((item, idx) => {
                    const d = derivedByDesc.get(item.product.descripcion)
                    const title = d?.title ?? shortDesc(item.product.descripcion)

                    return (
                      <div key={`${item.product.descripcion}||${item.opcion ?? ""}-${idx}`} className="rounded-lg border p-3 overflow-x-hidden">
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold leading-snug break-words">
                              {title}
                              {item.opcion ? <span className="text-muted-foreground"> — {item.opcion}</span> : null}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{formatCurrency(item.product.precio)}</p>
                          </div>

                          <Button variant="ghost" size="icon-sm" onClick={() => removeItem(item.product.descripcion, item.opcion)} aria-label="Eliminar">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="outline" size="sm" onClick={() => dec(item.product.descripcion, item.opcion)} aria-label="Restar">
                              <Minus className="size-4" />
                            </Button>
                            <span className="w-10 text-center font-semibold text-[12px]">{item.cantidad}</span>
                            <Button variant="outline" size="sm" onClick={() => inc(item.product.descripcion, item.opcion)} aria-label="Sumar">
                              <Plus className="size-4" />
                            </Button>
                          </div>

                          <div className="text-right min-w-0">
                            <p className="text-[11px] text-muted-foreground">Subtotal</p>
                            <p className="text-[12px] font-bold truncate max-w-[40vw]">{formatCurrency(item.subtotal)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex justify-end rounded-lg bg-muted/50 px-4 py-3 overflow-x-hidden">
                    <div className="flex flex-col items-end gap-1 min-w-0">
                      <div className="flex items-center gap-4 text-[11px] min-w-0">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium truncate max-w-[55vw]">{formatCurrency(total)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[13px] font-bold min-w-0">
                        <span>Total:</span>
                        <span className="text-primary truncate max-w-[55vw]">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ DESKTOP */}
                <div className="hidden sm:block max-h-64 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Producto</TableHead>
                        <TableHead className="text-xs w-20 text-center">Cant.</TableHead>
                        <TableHead className="text-xs text-right">P. Unit.</TableHead>
                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={`${item.product.descripcion}||${item.opcion ?? ""}-${idx}`}>
                          <TableCell className="text-xs">
                            {derivedByDesc.get(item.product.descripcion)?.title ?? shortDesc(item.product.descripcion)}
                            {item.opcion ? <span className="text-muted-foreground"> — {item.opcion}</span> : null}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={item.cantidad}
                              onChange={(e) => updateQuantity(item.product.descripcion, item.opcion, parseInt(e.target.value) || 0)}
                              className="h-7 w-16 text-center text-xs mx-auto"
                              inputMode="numeric"
                            />
                          </TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(item.product.precio)}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon-sm" onClick={() => removeItem(item.product.descripcion, item.opcion)} aria-label="Quitar">
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}