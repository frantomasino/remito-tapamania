import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const listId = searchParams.get("listId")

  if (!listId) {
    return NextResponse.json({ error: "Missing listId" }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("price_lists")
      .select("url")
      .eq("id", listId)
      .single()

    if (error || !data?.url) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    const res = await fetch(data.url, {
      next: { revalidate: 300 },
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