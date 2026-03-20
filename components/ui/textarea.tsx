import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full rounded-2xl bg-background px-4 py-3 text-sm text-foreground ring-1 ring-border outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 selection:bg-primary selection:text-primary-foreground aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }