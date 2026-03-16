import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get("url")

  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 })

  // Guard mínimo: solo permitir http/https
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 })
  }

  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch CSV" }, { status: 502 })

  const csv = await res.text()
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}