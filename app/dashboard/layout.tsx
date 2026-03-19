import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-dvh bg-background">
      <main className="pb-[88px]">{children}</main>
      <BottomNav />
    </div>
  )
}