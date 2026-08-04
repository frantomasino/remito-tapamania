"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { PlusCircle, ClipboardList, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  { href: "/dashboard/pedidos", label: "Historial", icon: ClipboardList },
  { href: "/dashboard/nuevo", label: "Nuevo", icon: PlusCircle, primary: true },
  { href: "/dashboard/perfil", label: "Cuenta", icon: Settings2 },
]

function getTodayISO() { return new Date().toISOString().slice(0, 10) }

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [todayCount, setTodayCount] = useState(0)

  useEffect(() => {
    navItems.forEach((item) => router.prefetch(item.href))
  }, [router])

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from("remitos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("fecha", getTodayISO())
      setTodayCount(count ?? 0)
    }
    load()
  }, [pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="mx-auto grid max-w-md grid-cols-3 items-center px-3 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard/pedidos"
            ? pathname === "/dashboard/pedidos"
            : pathname.startsWith(item.href)

          if (item.primary) {
            return (
              <Link key={item.href} href={item.href} prefetch aria-current={isActive ? "page" : undefined}
                className="flex items-center justify-center active:opacity-80">
                <div className="flex h-12 w-[5.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl bg-[#1565c0] text-white transition-opacity">
                  <item.icon className="size-5" />
                  <span className="text-[11px] font-semibold leading-none">{item.label}</span>
                </div>
              </Link>
            )
          }

          const isPedidos = item.href === "/dashboard/pedidos"

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={isActive ? "page" : undefined}
              {...(isPedidos ? { "data-onboarding": "nav-pedidos" } : {})}
              className="flex items-center justify-center active:opacity-60"
            >
              <div className={cn(
                "relative flex h-12 w-[5.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors",
                isActive ? "text-[#1565c0]" : "text-gray-400"
              )}>
                <item.icon className="size-5" />
                {isPedidos && todayCount > 0 && (
                  <div className="absolute top-0.5 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1565c0] px-1 text-[10px] font-bold text-white">
                    {todayCount > 99 ? "99+" : todayCount}
                  </div>
                )}
                <span className={cn("text-[11px] leading-none", isActive ? "font-semibold" : "font-medium")}>
                  {item.label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
