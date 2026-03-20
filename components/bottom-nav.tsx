"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { motion } from "framer-motion"
import { PlusCircle, User, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Pedidos", icon: ClipboardList },
  { href: "/dashboard/nuevo", label: "Nuevo", icon: PlusCircle, primary: true },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-5xl grid-cols-3 items-end px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={isActive ? "page" : undefined}
                className="flex items-center justify-center"
              >
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  animate={{
                    y: isActive ? -2 : 0,
                    scale: isActive ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className={cn(
                    "flex min-h-[62px] w-full max-w-[112px] flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-2 shadow-sm transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-primary/92 text-primary-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "stroke-[2.5px]" : "stroke-[2.3px]"
                    )}
                  />
                  <span className="text-[11px] font-semibold leading-none">
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={isActive ? "page" : undefined}
              className="flex items-center justify-center"
            >
              <motion.div
                whileTap={{ scale: 0.96 }}
                animate={{
                  y: isActive ? -1 : 0,
                }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className={cn(
                  "flex min-h-[58px] w-full max-w-[96px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "stroke-[2.4px]" : "stroke-[2px]"
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] leading-none",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}