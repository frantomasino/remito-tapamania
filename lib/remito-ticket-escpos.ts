import type { RemitoData, LineItem } from "@/lib/remito-types"
import {
  align, bold, cut, feed, hr, initPrinter, joinBytes, line, size, twoCols, wrapText,
} from "@/lib/escpos"

// Formato seguro para impresora térmica (sin Intl, sin Unicode)
function fmt(value: number): string {
  const [int, dec] = (Math.round(value * 100) / 100).toFixed(2).split(".")
  return `$${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${dec ? "," + dec : ""}`
}

// Reemplaza caracteres no-ASCII para impresoras térmicas
function ascii(text: string): string {
  return text
    .replace(/[áàäâ]/gi, "a")
    .replace(/[éèëê]/gi, "e")
    .replace(/[íìïî]/gi, "i")
    .replace(/[óòöô]/gi, "o")
    .replace(/[úùüû]/gi, "u")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/[°º]/g, " ")
    .replace(/[¿¡]/g, "")
}

function cleanDesc(value: string) {
  return value.replace(/\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim()
}

type PrintGroup = {
  title: string
  precio: number
  totalCantidad: number
  totalSubtotal: number
  totalDevolucion: number
  opciones: Array<{ opcion: string; cantidad: number; devolucion: number }>
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
      g.totalDevolucion += item.devolucion ?? 0
      if (item.opcion) {
        g.opciones.push({ opcion: item.opcion, cantidad: item.cantidad, devolucion: item.devolucion ?? 0 })
        g.hasOpciones = true
      }
    } else {
      groups.set(baseDesc, {
        title,
        precio: item.product.precio,
        totalCantidad: item.cantidad,
        totalSubtotal: item.subtotal,
        totalDevolucion: item.devolucion ?? 0,
        opciones: item.opcion ? [{ opcion: item.opcion, cantidad: item.cantidad, devolucion: item.devolucion ?? 0 }] : [],
        hasOpciones: !!item.opcion,
      })
    }
  }
  return Array.from(groups.values())
}

export function buildRemitoEscPos(
  data: RemitoData,
  empresa = "Remito",
  vendedor = "",
  telefono = "",
  alias = ""
) {
  const total = data.items.reduce((sum, item) => sum + item.subtotal, 0)
  const totalUnidades = data.items.reduce((sum, item) => sum + item.cantidad, 0)
  const totalDevolucion = data.items.reduce((sum, item) => sum + (item.devolucion ?? 0), 0)
  const comercio = ascii((data.client.nombre ?? "").trim() || "Sin especificar")
  const grouped = groupItems(data.items)

  const chunks: Uint8Array[] = []

  chunks.push(initPrinter())

  // --- HEADER ---
  chunks.push(align("center"))
  chunks.push(bold(true))
  chunks.push(size(1, 1))
  chunks.push(line(ascii(empresa.toUpperCase()) || "REMITO"))
  chunks.push(size(0, 0))
  chunks.push(bold(false))

  if (telefono) chunks.push(line(ascii(telefono)))

  if (alias) {
    chunks.push(bold(true))
    chunks.push(size(1, 1))
    chunks.push(line(ascii(`ALIAS: ${alias.toUpperCase()}`)))
    chunks.push(size(0, 0))
    chunks.push(bold(false))
  }

  chunks.push(line("Remito / Comprobante"))
  chunks.push(line(`N ${data.numero}`))
  chunks.push(line(data.fecha))
  chunks.push(hr())

  // --- INFO ---
  chunks.push(align("left"))
  chunks.push(twoCols("Comercio:", comercio, 32))
  if (vendedor) chunks.push(twoCols("Vendedor:", ascii(vendedor), 32))
  chunks.push(twoCols("Items:", String(grouped.length), 32))
  chunks.push(twoCols("Unidades:", String(totalUnidades), 32))
  if (totalDevolucion > 0) {
    chunks.push(twoCols("Devoluciones:", String(totalDevolucion), 32))
  }
  chunks.push(hr())

  // --- PRODUCTOS ---
  chunks.push(bold(true))
  chunks.push(twoCols("Producto", "Subtotal", 32))
  chunks.push(bold(false))
  chunks.push(hr())

  for (const group of grouped) {
    const titleLines = wrapText(ascii(`${group.title} x${group.totalCantidad}`), 32)
    for (const l of titleLines) chunks.push(line(l))

    if (group.hasOpciones && group.opciones.length > 0) {
      const detalle = group.opciones.filter(o => o.cantidad > 0).map(o => `${ascii(o.opcion)} ${o.cantidad}`).join(", ")
      if (detalle) {
        for (const l of wrapText(detalle, 30)) chunks.push(line(`  ${l}`))
      }
    }

    if (group.totalDevolucion > 0) {
      const devText = group.hasOpciones
        ? group.opciones.filter(o => o.devolucion > 0).map(o => `${o.devolucion} ${ascii(o.opcion)}`).join(", ")
        : String(group.totalDevolucion)
      for (const l of wrapText(`Dev: ${devText}`, 30)) chunks.push(line(`  ${l}`))
    }

    chunks.push(twoCols(`${group.totalCantidad} x ${fmt(group.precio)}`, fmt(group.totalSubtotal), 32))
    chunks.push(hr("-".charCodeAt(0), 32))
  }

  // --- TOTALES ---
  chunks.push(twoCols("Subtotal", fmt(total), 32))
  chunks.push(bold(true))
  chunks.push(size(1, 0))
  chunks.push(twoCols("TOTAL", fmt(total), 16))
  chunks.push(size(0, 0))
  chunks.push(bold(false))

  if (totalDevolucion > 0) {
    chunks.push(hr())
    chunks.push(twoCols("Devoluciones:", `${totalDevolucion} u.`, 32))
  }

  // --- FOOTER ---
  chunks.push(feed(2))
  chunks.push(align("center"))
  chunks.push(line("Gracias"))
  chunks.push(feed(3))
  chunks.push(cut())

  return joinBytes(...chunks)
}