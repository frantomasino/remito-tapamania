import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    console.log("API KEY:", process.env.ANTHROPIC_API_KEY?.slice(0, 20))

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("image") as File
    if (!file) return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp"

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Esta es una factura de una fábrica de tapas y pastas. 
Extraé todos los productos con su cantidad de la columna "Cant." y "Descripción".
Devolvé SOLO un JSON array con este formato exacto, sin texto adicional ni backticks:
[{"descripcion": "nombre del producto", "cantidad": numero}]
Si no podés leer algún producto, omitilo. Solo devolvé el JSON array.`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Error Claude:", err)
      return NextResponse.json({ error: "Error al procesar la imagen" }, { status: 500 })
    }

    const claudeData = await response.json()
    const text = claudeData.content?.[0]?.text ?? ""
    console.log("Respuesta Claude:", text)

    let productos: { descripcion: string; cantidad: number }[] = []
    try {
      const clean = text.replace(/```json|```/g, "").trim()
      productos = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: "No se pudo leer la factura correctamente" }, { status: 422 })
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json({ error: "No se encontraron productos en la imagen" }, { status: 422 })
    }

    const today = new Date().toISOString().slice(0, 10)

    await supabase
      .from("stock_diario")
      .delete()
      .eq("user_id", user.id)
      .eq("fecha", today)

    const { error: insertError } = await supabase.from("stock_diario").insert(
      productos.map((p) => ({
        user_id: user.id,
        fecha: today,
        descripcion: p.descripcion,
        cantidad_inicial: p.cantidad,
        cantidad_restante: p.cantidad,
      }))
    )

    if (insertError) {
      console.error("Error insertando stock:", insertError)
      return NextResponse.json({ error: "Error al guardar el stock" }, { status: 500 })
    }

    return NextResponse.json({ productos, total: productos.length })
  } catch (error) {
    console.error("Error en scan-factura:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}