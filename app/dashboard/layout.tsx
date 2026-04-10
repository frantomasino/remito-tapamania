import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-dvh bg-[#111214] text-white">
      <div className="mx-auto w-full max-w-md">
        <main className="min-h-dvh pb-[calc(72px+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  )
}