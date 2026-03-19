export interface Product {
  descripcion: string
  precio: number
}

export interface LineItem {
  product: Product
  cantidad: number
  subtotal: number
  opcion?: string
}

export interface ClientData {
  nombre: string
  direccion?: string
  telefono?: string
  mail?: string
  formaPago?: string
}

export interface RemitoData {
  numero: string
  fecha: string
  client: ClientData
  items: LineItem[]
  subtotal: number
  total: number
}

export interface SaleRecord {
  id: string
  numero: string
  fecha: string
  cliente: string
  formaPago?: string
  total: number
  itemCount: number
}

export function parseCSV(text: string): Product[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) return []

  const normalizeHeader = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/"/g, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

  const detectDelimiter = (sample: string) => {
    const counts = {
      "\t": (sample.match(/\t/g) || []).length,
      ";": (sample.match(/;/g) || []).length,
      ",": (sample.match(/,/g) || []).length,
    }
    return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as "\t" | ";" | ",") || ";"
  }

  const parsePrice = (raw: string): number => {
    if (!raw) return NaN
    let s = String(raw).trim()

    s = s.replace(/\$/g, "").replace(/\s+/g, "")

    if (s.includes(".") && s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".")
      const n = Number(s)
      return Number.isFinite(n) ? n : NaN
    }

    if (s.includes(".") && !s.includes(",")) {
      const parts = s.split(".")
      const last = parts[parts.length - 1]
      if (/^\d{3}$/.test(last)) {
        s = s.replace(/\./g, "")
        const n = Number(s)
        return Number.isFinite(n) ? n : NaN
      }
      const n = Number(s)
      return Number.isFinite(n) ? n : NaN
    }

    if (s.includes(",") && !s.includes(".")) {
      s = s.replace(",", ".")
      const n = Number(s)
      return Number.isFinite(n) ? n : NaN
    }

    const n = Number(s)
    return Number.isFinite(n) ? n : NaN
  }

  const headerLine = lines[0]
  const separator = detectDelimiter(headerLine)
  const headers = headerLine.split(separator).map(normalizeHeader)

  const descripcionIdx = headers.findIndex(
    (h) => h.includes("descripcion") || h.includes("nombre") || h.includes("producto") || h.includes("detalle")
  )
  const precioIdx = headers.findIndex(
    (h) =>
      h.includes("precio") ||
      h.includes("price") ||
      h.includes("valor") ||
      h.includes("importe") ||
      h.includes("costo")
  )

  const headerOk = descripcionIdx !== -1 && precioIdx !== -1

  const products: Product[] = []
  const seen = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    const cols = line.split(separator).map((c) => c.trim().replace(/"/g, ""))

    let descripcion = ""
    let precioRaw = ""

    if (headerOk) {
      descripcion = cols[descripcionIdx] || ""
      precioRaw = cols[precioIdx] || ""
    } else {
      if (cols.length >= 2) {
        descripcion = cols[0] || ""
        precioRaw = cols[1] || ""
      } else {
        continue
      }
    }

    if (!descripcion) continue

    const precio = parsePrice(precioRaw)
    if (!Number.isFinite(precio) || precio <= 0) continue

    const key = `${descripcion}||${precio}`
    if (seen.has(key)) continue
    seen.add(key)

    products.push({ descripcion, precio })
  }

  return products
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatRemitoNumber(n: number): string {
  const punto = "00001"
  const numero = String(n).padStart(8, "0")
  return `${punto}-${numero}`
}

export function getTodayDate(): string {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export interface RemitoItemRow {
  id: string
  remito_id: string
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario?: number | null
  subtotal: number | null
  opcion?: string | null
}

export interface RemitoWithItems {
  id: string
  numero_remito: string
  fecha: string
  cliente_nombre: string | null
  cliente_direccion?: string | null
  cliente_telefono?: string | null
  estado: "pendiente" | "entregado" | "cancelado"
  observaciones?: string | null
  total?: number | null
  remito_items: RemitoItemRow[]
}