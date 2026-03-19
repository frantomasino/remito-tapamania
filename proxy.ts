import { updateSession } from "@/lib/supabase/middleware"
import { type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const res = await updateSession(request)
  res.headers.set("x-mw", "on")
  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
}