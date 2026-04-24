import type { RemitoData, LineItem } from "@/lib/remito-types"
import { formatCurrency } from "@/lib/remito-types"
import {
  align, bold, cut, feed, hr, initPrinter, joinBytes, line, size, twoCols, wrapText,
} from "@/lib/escpos"

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
  const comercio = (data.client.nombre ?? "").trim() || "Sin especificar"
  const grouped = groupItems(data.items)

  const chunks: Uint8Array[] = []

  chunks.push(initPrinter())

  // --- HEADER ---
  chunks.push(align("center"))
  chunks.push(bold(true))
  chunks.push(size(1, 1)) // Grande para la empresa
  chunks.push(line(empresa.toUpperCase() || "REMITO"))
  
  chunks.push(size(0, 0)) // Volver a tamaño normal
  chunks.push(bold(false))
  
  if (telefono) chunks.push(line(telefono))
  
  // --- ALIAS AGRANDADO ---
 if (alias) {
    chunks.push(bold(true))
    chunks.push(size(1, 1)) // <--- CAMBIÁ (1, 0) POR (1, 1) PARA MÁXIMO TAMAÑO
    chunks.push(line(`ALIAS: ${alias.toUpperCase()}`))
    chunks.push(size(0, 0)) // RESET PARA VOLVER A TAMAÑO NORMAL
    chunks.push(bold(false))
  }

  chunks.push(line("Remito / Comprobante"))
  chunks.push(line(`N° ${data.numero}`))
  chunks.push(line(data.fecha))
  chunks.push(hr())

  // --- INFO CLIENTE / VENDEDOR ---
  chunks.push(align("left"))
  chunks.push(twoCols("Comercio:", comercio, 32))
  if (vendedor) chunks.push(twoCols("Vendedor:", vendedor, 32))
  chunks.push(twoCols("Items:", String(grouped.length), 32))
  chunks.push(twoCols("Unidades:", String(totalUnidades), 32))
  if (totalDevolucion > 0) {
    chunks.push(twoCols("Devoluciones:", String(totalDevolucion), 32))
  }
  chunks.push(hr())

  // --- TABLA PRODUCTOS ---
  chunks.push(bold(true))
  chunks.push(twoCols("Producto", "Subtotal", 32))
  chunks.push(bold(false))
  chunks.push(hr())

  for (const group of grouped) {
    const titleWithQty = `${group.title} x${group.totalCantidad}`
    const titleLines = wrapText(titleWithQty, 32)
    for (const l of titleLines) chunks.push(line(l))

    if (group.hasOpciones && group.opciones.length > 0) {
      const detalle = group.opciones.filter(o => o.cantidad > 0).map((o) => `${o.opcion} ${o.cantidad}`).join(", ")
      if (detalle) {
        const detalleLines = wrapText(detalle, 30)
        for (const l of detalleLines) chunks.push(line(`  ${l}`))
      }
    }

    if (group.totalDevolucion > 0) {
      const devText = group.hasOpciones
        ? group.opciones.filter(o => o.devolucion > 0).map((o) => `${o.devolucion} ${o.opcion}`).join(", ")
        : String(group.totalDevolucion)
      const devLines = wrapText(`Dev: ${devText}`, 30)
      for (const l of devLines) chunks.push(line(`  ${l}`))
    }

    chunks.push(twoCols(`${group.totalCantidad} x ${formatCurrency(group.precio)}`, formatCurrency(group.totalSubtotal), 32))
    chunks.push(hr("-".charCodeAt(0), 32))
  }

  // --- TOTALES ---
  chunks.push(twoCols("Subtotal", formatCurrency(total), 32))
  chunks.push(bold(true))
  chunks.push(size(1, 0)) // Total en ancho doble para que se vea bien
  chunks.push(twoCols("TOTAL", formatCurrency(total), 16)) // 16 porque el ancho doble reduce las columnas
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