"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PlusCircle, User, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard/nuevo", label: "Nuevo", icon: PlusCircle },
  { href: "/dashboard/perfil", label: "Perfil", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-medium text-muted-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Salir</span>
          </button>
        </form>
      </div>
    </nav>
  )
}