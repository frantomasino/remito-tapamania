"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { PlusCircle, User, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard/nuevo", label: "Nuevo", icon: PlusCircle, primary: true },
  { href: "/dashboard", label: "Pedidos", icon: ClipboardList },
  { href: "/dashboard/perfil", label: "Perfil", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href)
    })
  }, [router])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/96 backdrop-blur">
      <div
        className="mx-auto grid max-w-5xl grid-cols-3 items-center px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2"
      >
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "mx-1 flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
                item.primary && isActive && "bg-primary text-primary-foreground",
                item.primary && !isActive && "text-foreground",
                !item.primary && isActive && "bg-primary/10 text-primary",
                !item.primary && !isActive && "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "stroke-[2.4px]" : "stroke-[2px]"
                )}
              />
              <span className="leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}