import type { RemitoData } from "@/lib/remito-types"
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

export function buildRemitoEscPos(data: RemitoData) {
  const total = data.items.reduce((sum, item) => sum + item.subtotal, 0)
  const totalUnidades = data.items.reduce((sum, item) => sum + item.cantidad, 0)
  const comercio = (data.client.nombre ?? "").trim() || "Sin especificar"

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
  chunks.push(twoCols("Items:", String(data.items.length), 32))
  chunks.push(twoCols("Unidades:", String(totalUnidades), 32))
  chunks.push(hr())

  chunks.push(bold(true))
  chunks.push(twoCols("Producto", "Subtotal", 32))
  chunks.push(bold(false))
  chunks.push(hr())

  for (const item of data.items) {
    const title = cleanDesc(item.product.descripcion) + (item.opcion ? ` · ${item.opcion}` : "")
    const lines = wrapText(title, 32)

    for (const l of lines) {
      chunks.push(line(l))
    }

    chunks.push(
      twoCols(
        `${item.cantidad} x ${formatCurrency(item.product.precio)}`,
        formatCurrency(item.subtotal),
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