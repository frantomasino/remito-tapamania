import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith("/auth")

  // 1) Sin usuario → login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // 2) Con usuario en rutas /auth → dashboard (excepto rutas permitidas)
  if (user && isAuthRoute) {
    const allowWhenLogged = ["/auth/callback", "/auth/signout", "/auth/error", "/auth/sign-up-success", "/auth/suspendido"]
    if (!allowWhenLogged.some((p) => path.startsWith(p))) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // 3) Con usuario en rutas privadas → chequear si está activo
  if (user && !isAuthRoute && !path.startsWith("/auth/suspendido")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("activo")
      .eq("id", user.id)
      .single()

    if (profile?.activo === false) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/suspendido"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}