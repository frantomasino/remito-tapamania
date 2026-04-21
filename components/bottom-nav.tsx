"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { PlusCircle, ClipboardList, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/dashboard/nuevo", label: "Nuevo", icon: PlusCircle, primary: true },
  { href: "/dashboard/perfil", label: "Cuenta", icon: Settings2 },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    navItems.forEach((item) => router.prefetch(item.href))
  }, [router])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="mx-auto grid max-w-md grid-cols-3 items-center px-4 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1.5">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard/pedidos"
            ? pathname === "/dashboard/pedidos"
            : pathname.startsWith(item.href)

          if (item.primary) {
            return (
              <Link key={item.href} href={item.href} prefetch aria-current={isActive ? "page" : undefined} className="flex items-center justify-center">
                <div className="flex h-9 w-20 flex-col items-center justify-center gap-0.5 rounded-xl bg-[#1565c0] text-white active:opacity-80 transition-opacity">
                  <item.icon className="size-4" />
                  <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                </div>
              </Link>
            )
          }

          return (
            <Link key={item.href} href={item.href} prefetch aria-current={isActive ? "page" : undefined} className="flex items-center justify-center">
              <div className={cn(
                "flex h-9 w-20 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors",
                isActive ? "text-[#1565c0]" : "text-gray-400"
              )}>
                <item.icon className="size-4" />
                <span className={cn("text-[10px] leading-none", isActive ? "font-semibold" : "font-medium")}>
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