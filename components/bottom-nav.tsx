"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { motion } from "framer-motion"
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
    navItems.forEach((item) => {
      router.prefetch(item.href)
    })
  }, [router])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#2a2926]/98 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-3 items-end px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard/pedidos"
              ? pathname === "/dashboard/pedidos"
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
                    "flex min-h-[60px] w-full max-w-[108px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 shadow-sm transition-all",
                    isActive
                      ? "border-[#2b8cff]/30 bg-[#1976d2] text-white shadow-[0_8px_24px_rgba(25,118,210,0.28)]"
                      : "border-white/10 bg-[#1976d2] text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-semibold leading-none">{item.label}</span>
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
                animate={{ y: isActive ? -1 : 0 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className={cn(
                  "flex min-h-[56px] w-full max-w-[94px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 transition-colors",
                  isActive
                    ? "border-white/10 bg-white/5 text-white"
                    : "border-transparent text-[#a9a9ae]"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span
                  className={cn(
                    "text-xs leading-none",
                    isActive ? "font-semibold text-white" : "font-medium"
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