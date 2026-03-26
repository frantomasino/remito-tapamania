export function joinBytes(...chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0

  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }

  return out
}

export function text(value: string) {
  return new TextEncoder().encode(value)
}

export function line(value = "") {
  return text(`${value}\n`)
}

export function hr(char = "-".charCodeAt(0), width = 32) {
  return line(String.fromCharCode(char).repeat(width))
}

export function align(mode: "left" | "center" | "right") {
  const map = { left: 0, center: 1, right: 2 } as const
  return Uint8Array.from([0x1b, 0x61, map[mode]])
}

export function bold(on: boolean) {
  return Uint8Array.from([0x1b, 0x45, on ? 1 : 0])
}

export function size(width = 0, height = 0) {
  const n = ((width & 0x0f) << 4) | (height & 0x0f)
  return Uint8Array.from([0x1d, 0x21, n])
}

export function initPrinter() {
  return Uint8Array.from([0x1b, 0x40])
}

export function feed(lines = 1) {
  return Uint8Array.from([0x1b, 0x64, lines])
}

export function cut() {
  return Uint8Array.from([0x1d, 0x56, 0x41, 0x00])
}

export function padRight(value: string, width: number) {
  if (value.length >= width) return value.slice(0, width)
  return value + " ".repeat(width - value.length)
}

export function padLeft(value: string, width: number) {
  if (value.length >= width) return value.slice(0, width)
  return " ".repeat(width - value.length) + value
}

export function twoCols(left: string, right: string, width = 32) {
  const safeRight = right.slice(0, width)
  const leftWidth = Math.max(0, width - safeRight.length)
  return line(padRight(left, leftWidth) + safeRight)
}

export function wrapText(value: string, width = 32) {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= width) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word.length > width ? word.slice(0, width) : word
    }
  }

  if (current) lines.push(current)
  return lines
}