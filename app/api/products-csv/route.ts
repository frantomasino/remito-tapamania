import { NextResponse } from "next/server"

const PRICE_LIST_URLS = {
  minorista: process.env.NEXT_PUBLIC_LISTA_MINORISTA_URL,
  mayorista: process.env.NEXT_PUBLIC_LISTA_MAYORISTA_URL,
  oferta: process.env.NEXT_PUBLIC_LISTA_OFERTA_URL,
} as const

type PriceListKey = keyof typeof PRICE_LIST_URLS

function isValidList(value: string | null): value is PriceListKey {
  return value === "minorista" || value === "mayorista" || value === "oferta"
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const list = searchParams.get("list")

  if (!isValidList(list)) {
    return NextResponse.json({ error: "Invalid list" }, { status: 400 })
  }

  const url = PRICE_LIST_URLS[list]

  if (!url) {
    return NextResponse.json({ error: "Price list not configured" }, { status: 500 })
  }

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 }, // 5 minutos
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch price list" }, { status: 502 })
    }

    const csv = await res.text()

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Unexpected error fetching price list" },
      { status: 500 }
    )
  }
}