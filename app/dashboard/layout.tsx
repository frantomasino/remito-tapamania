import { BottomNav } from "@/components/bottom-nav"
import { bottomNavScrollPadding } from "@/lib/bottom-nav-layout"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-gray-100 text-gray-900">
      <div className="mx-auto w-full max-w-md">
        <main
          className="min-h-dvh"
          style={{ paddingBottom: bottomNavScrollPadding() }}
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
