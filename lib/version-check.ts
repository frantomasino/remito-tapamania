import { createClient } from "@/lib/supabase/client"

const LOCAL_KEY = "app_version"

export async function checkAppVersion() {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "app_version")
      .single()

    if (!data) return

    const remoteVersion = data.value
    const localVersion = localStorage.getItem(LOCAL_KEY)

    if (localVersion !== remoteVersion) {
      localStorage.setItem(LOCAL_KEY, remoteVersion)
      window.location.reload()
    }
  } catch (e) {
    // silencioso, no rompe la app
  }
}