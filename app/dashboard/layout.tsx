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
    <div className="flex min-h-dvh flex-col bg-background pb-20">
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  )
}