import { formatCurrency } from "@/lib/remito-types"

export type DailySummaryItem = {
  numero: string
  cliente: string
  total: number
  priceList?: string
  formaPagoCliente?: string | null
}

export type DailySummaryData = {
  fecha: string
  cantidadPedidos: number
  totalDia: number
  pedidos: DailySummaryItem[]
}

const encoder = new TextEncoder()

function text(value: string) { return encoder.encode(value) }
function lf(count = 1) { return new Uint8Array(Array(count).fill(0x0a)) }

function joinBytes(...parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) { out.set(part, offset); offset += part.length }
  return out
}

function escPosInit() { return new Uint8Array([0x1b, 0x40]) }
function escPosAlignLeft() { return new Uint8Array([0x1b, 0x61, 0x00]) }
function escPosAlignCenter() { return new Uint8Array([0x1b, 0x61, 0x01]) }
function escPosBold(on: boolean) { return new Uint8Array([0x1b, 0x45, on ? 0x01 : 0x00]) }
function escPosDoubleSize(on: boolean) { return new Uint8Array([0x1d, 0x21, on ? 0x11 : 0x00]) }
function escPosCut() { return new Uint8Array([0x1d, 0x56, 0x00]) }
function line(width = 32) { return "-".repeat(width) }

function clean(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
}

function fitRight(label: string, value: string, width = 32) {
  const left = clean(label)
  const right = clean(value)
  const spaces = Math.max(1, width - left.length - right.length)
  return `${left}${" ".repeat(spaces)}${right}`
}

function wrapText(value: string, width = 32) {
  const words = clean(value).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= width) { current = next; continue }
    if (current) lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  return lines
}

const PRICE_LIST_LABELS: Record<string, string> = {
  minorista: "Minorista",
  mayorista: "Mayorista",
  oferta: "Oferta",
}

export function buildDailySummaryEscPos(data: DailySummaryData) {
  const parts: Uint8Array[] = []

  parts.push(escPosInit())
  parts.push(escPosAlignCenter())
  parts.push(escPosBold(true))
  parts.push(escPosDoubleSize(true))
  parts.push(text("RESUMEN DEL DIA"))
  parts.push(lf())
  parts.push(escPosDoubleSize(false))
  parts.push(escPosBold(false))
  parts.push(text(clean(data.fecha)))
  parts.push(lf(2))

  // ── TOTALES GENERALES ──
  parts.push(escPosAlignLeft())
  parts.push(text(line()))
  parts.push(lf())
  parts.push(text(fitRight("Pedidos", String(data.cantidadPedidos))))
  parts.push(lf())
  parts.push(text(fitRight("Total", formatCurrency(data.totalDia))))
  parts.push(lf())

  // ── DESGLOSE POR LISTA DE PRECIOS ──
  const byList = new Map<string, { count: number; total: number }>()
  for (const pedido of data.pedidos) {
    const list = pedido.priceList || "minorista"
    const existing = byList.get(list) ?? { count: 0, total: 0 }
    byList.set(list, { count: existing.count + 1, total: existing.total + pedido.total })
  }

  if (byList.size > 1) {
    parts.push(text(line()))
    parts.push(lf())
    parts.push(escPosBold(true))
    parts.push(text("Desglose por lista:"))
    parts.push(lf())
    parts.push(escPosBold(false))
    for (const [list, { count, total }] of byList.entries()) {
      const label = PRICE_LIST_LABELS[list] ?? list
      parts.push(text(fitRight(`${label} (${count})`, formatCurrency(total))))
      parts.push(lf())
    }
  }

  // ── DESGLOSE POR FORMA DE PAGO ──
  const efectivo = data.pedidos.filter(p => p.formaPagoCliente === "efectivo" || !p.formaPagoCliente)
  const mp = data.pedidos.filter(p => p.formaPagoCliente === "mercadopago")

  parts.push(text(line()))
  parts.push(lf())
  parts.push(escPosBold(true))
  parts.push(text("Forma de pago:"))
  parts.push(lf())
  parts.push(escPosBold(false))

  const totalEfectivo = efectivo.reduce((s, p) => s + p.total, 0)
  const totalMp = mp.reduce((s, p) => s + p.total, 0)

  parts.push(text(fitRight(`Efectivo (${efectivo.length})`, formatCurrency(totalEfectivo))))
  parts.push(lf())
  if (mp.length > 0) {
    parts.push(text(fitRight(`Mercado Pago (${mp.length})`, formatCurrency(totalMp))))
    parts.push(lf())
  }
  parts.push(text(line()))
  parts.push(lf())
  parts.push(escPosBold(true))
  parts.push(text(fitRight("TOTAL DIA", formatCurrency(totalEfectivo + totalMp))))
  parts.push(lf())
  parts.push(escPosBold(false))

  // ── DETALLE POR PEDIDO ──
  parts.push(text(line()))
  parts.push(lf())

  for (const pedido of data.pedidos) {
    // Número de pedido
    parts.push(escPosBold(true))
    parts.push(text(clean(pedido.numero)))
    parts.push(lf())
    parts.push(escPosBold(false))

    // Cliente
    for (const row of wrapText(pedido.cliente || "Sin cliente", 32)) {
      parts.push(text(row))
      parts.push(lf())
    }

    // Forma de pago del cliente
    const fpLabel = pedido.formaPagoCliente === "mercadopago" ? "Mercado Pago" : "Efectivo"
    parts.push(text(fpLabel))
    parts.push(lf())

    // Total
    parts.push(text(fitRight("Total", formatCurrency(pedido.total))))
    parts.push(lf())
    parts.push(text(line(24)))
    parts.push(lf())
  }

  parts.push(lf())
  parts.push(escPosAlignCenter())
  parts.push(text("Fin del resumen"))
  parts.push(lf(4))
  parts.push(escPosCut())

  return joinBytes(...parts)
}