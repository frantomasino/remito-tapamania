"use client"

import { useEffect, useState } from "react"
import RemitoPage from "@/components/remito-page"
import { Onboarding } from "@/components/onboarding"
import { createClient } from "@/lib/supabase/client"

export default function NuevoPage() {
  const [userId, setUserId] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""))
  }, [])

  return (
    <>
      <RemitoPage />
      {userId && <Onboarding userId={userId} />}
    </>
  )
}