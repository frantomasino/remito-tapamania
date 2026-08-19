import { createClient } from "@/lib/supabase/client"

const LOCAL_KEY = "app_version"
const SESSION_KEY = "app_version_checked"

export async function checkAppVersion() {
  try {
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY)) return

    const supabase = createClient()
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "app_version")
      .single()

    if (typeof window !== "undefined") sessionStorage.setItem(SESSION_KEY, "1")
    if (!data) return

    const remoteVersion = data.value
    const localVersion = localStorage.getItem(LOCAL_KEY)

    if (localVersion !== remoteVersion) {
      localStorage.setItem(LOCAL_KEY, remoteVersion)
      window.location.reload()
    }
  } catch {
    // silencioso, no rompe la app
  }
}
