import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Middleware helper para:
 * - Mantener la sesión de Supabase sincronizada con cookies (SSR).
 * - Proteger rutas privadas (ej: /dashboard).
 * - Evitar bugs típicos: logout que no ejecuta por redirección prematura.
 */
export async function updateSession(request: NextRequest) {
  // Respuesta base que Next usará si no redirigimos.
  let supabaseResponse = NextResponse.next({ request })

  /**
   * IMPORTANTE:
   * - No guardes el cliente en una variable global.
   * - Crealo por request para evitar problemas en entornos serverless/edge.
   */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Leemos todas las cookies que llegan en el request.
         * Supabase las usa para recuperar/validar sesión.
         */
        getAll() {
          return request.cookies.getAll()
        },

        /**
         * Cuando Supabase necesita setear cookies (refresh token, etc),
         * las aplicamos sobre la respuesta que vamos a devolver.
         *
         * OJO: acá se crea un NextResponse nuevo para que las cookies queden
         * “pegadas” a la respuesta final.
         */
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

  /**
   * Regla de oro de Supabase SSR:
   * No metas lógica entre createServerClient(...) y auth.getUser()
   * porque podés provocar desincronización y “random logouts”.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith("/auth")

  /**
   * 1) Si NO hay usuario logueado y NO está en /auth:
   *    -> mandalo a /auth/login
   *    (esto protege /dashboard y cualquier ruta privada)
   */
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  /**
   * 2) Si HAY usuario logueado y entra a /auth:
   *    Normalmente lo mandamos a /dashboard para que no vuelva a login/signup.
   *
   *    PERO: hay rutas /auth que DEBEN poder ejecutarse aunque haya user,
   *    por ejemplo:
   *    - /auth/callback  (cuando confirmás email / magic link)
   *    - /auth/signout   (cerrar sesión: si lo bloqueás, nunca se desloguea)
   *    - /auth/error     (página de error)
   *    - /auth/sign-up-success (pantalla “revisá tu email”)
   */
  if (user && isAuthRoute) {
    const allowWhenLogged = ["/auth/callback", "/auth/signout", "/auth/error", "/auth/sign-up-success"]

    // Si NO es una de las rutas permitidas, redirigimos al dashboard
    if (!allowWhenLogged.some((p) => path.startsWith(p))) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  /**
   * Siempre devolvé supabaseResponse (con cookies actualizadas).
   * Si devolvés un NextResponse distinto sin copiar cookies,
   * podés romper la sesión.
   */
  return supabaseResponse
}