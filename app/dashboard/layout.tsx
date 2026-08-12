import { BottomNav } from "@/components/bottom-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-gray-100 text-gray-900">
      <div className="mx-auto w-full max-w-md">
        <main className="min-h-dvh pb-[calc(72px+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
