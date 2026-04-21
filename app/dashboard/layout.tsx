import { BottomNav } from "@/components/bottom-nav"
import { headers } from "next/headers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""
  const isNuevo = pathname.includes("/dashboard/nuevo")

  return (
    <div className="min-h-dvh bg-gray-100 text-gray-900">
      <div className="mx-auto w-full max-w-md">
        <main className="min-h-dvh pb-[calc(72px+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </div>
      {!isNuevo && <BottomNav />}
    </div>
  )
}