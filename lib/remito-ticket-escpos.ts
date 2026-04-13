import type { RemitoData, LineItem } from "@/lib/remito-types"
import { formatCurrency } from "@/lib/remito-types"
import {
  align,
  bold,
  cut,
  feed,
  hr,
  initPrinter,
  joinBytes,
  line,
  size,
  twoCols,
  wrapText,
} from "@/lib/escpos"

function cleanDesc(value: string) {
  return value
    .replace(/\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

// Agrupa ítems del mismo producto base
type PrintGroup = {
  title: string
  precio: number
  totalCantidad: number
  totalSubtotal: number
  opciones: Array<{ opcion: string; cantidad: number }>
  hasOpciones: boolean
}

function groupItems(items: LineItem[]): PrintGroup[] {
  const groups = new Map<string, PrintGroup>()

  for (const item of items) {
    const baseDesc = item.product.descripcion
    const title = cleanDesc(baseDesc)

    if (groups.has(baseDesc)) {
      const g = groups.get(baseDesc)!
      g.totalCantidad += item.cantidad
      g.totalSubtotal += item.subtotal
      if (item.opcion) {
        g.opciones.push({ opcion: item.opcion, cantidad: item.cantidad })
        g.hasOpciones = true
      }
    } else {
      groups.set(baseDesc, {
        title,
        precio: item.product.precio,
        totalCantidad: item.cantidad,
        totalSubtotal: item.subtotal,
        opciones: item.opcion ? [{ opcion: item.opcion, cantidad: item.cantidad }] : [],
        hasOpciones: !!item.opcion,
      })
    }
  }

  return Array.from(groups.values())
}

export function buildRemitoEscPos(data: RemitoData) {
  const total = data.items.reduce((sum, item) => sum + item.subtotal, 0)
  const totalUnidades = data.items.reduce((sum, item) => sum + item.cantidad, 0)
  const comercio = (data.client.nombre ?? "").trim() || "Sin especificar"
  const grouped = groupItems(data.items)

  const chunks: Uint8Array[] = []

  chunks.push(initPrinter())

  chunks.push(align("center"))
  chunks.push(bold(true))
  chunks.push(size(1, 1))
  chunks.push(line("TAPAMANIA"))
  chunks.push(size(0, 0))
  chunks.push(bold(false))
  chunks.push(line("Remito / Comprobante"))
  chunks.push(line(`N° ${data.numero}`))
  chunks.push(line(data.fecha))
  chunks.push(hr())

  chunks.push(align("left"))
  chunks.push(twoCols("Comercio:", comercio, 32))
  chunks.push(twoCols("Items:", String(grouped.length), 32))
  chunks.push(twoCols("Unidades:", String(totalUnidades), 32))
  chunks.push(hr())

  chunks.push(bold(true))
  chunks.push(twoCols("Producto", "Subtotal", 32))
  chunks.push(bold(false))
  chunks.push(hr())

  for (const group of grouped) {
    // Nombre + total unidades en la misma línea
    // Ej: "Tapas empanadas x 330g.  30 u."
    const titleWithQty = `${group.title} x${group.totalCantidad}`
    const titleLines = wrapText(titleWithQty, 32)
    for (const l of titleLines) chunks.push(line(l))

    // Desglose de opciones si las hay: "Horno 10, Freír 15, Criolla 5"
    if (group.hasOpciones && group.opciones.length > 0) {
      const detalle = group.opciones
        .map((o) => `${o.opcion} ${o.cantidad}`)
        .join(", ")
      const detalleLines = wrapText(detalle, 30)
      for (const l of detalleLines) chunks.push(line(`  ${l}`))
    }

    // Precio unitario × total → subtotal
    chunks.push(
      twoCols(
        `${group.totalCantidad} x ${formatCurrency(group.precio)}`,
        formatCurrency(group.totalSubtotal),
        32
      )
    )

    chunks.push(hr("-".charCodeAt(0), 32))
  }

  chunks.push(twoCols("Subtotal", formatCurrency(total), 32))
  chunks.push(bold(true))
  chunks.push(twoCols("TOTAL", formatCurrency(total), 32))
  chunks.push(bold(false))
  chunks.push(feed(2))

  chunks.push(align("center"))
  chunks.push(line("Gracias"))
  chunks.push(feed(3))
  chunks.push(cut())

  return joinBytes(...chunks)
}