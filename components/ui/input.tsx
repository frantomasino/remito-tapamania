"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-white/10 bg-[#1a1a1c] px-4 text-[15px] text-white outline-none transition-colors selection:bg-[#1976d2] selection:text-white placeholder:text-[#8f8f95] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-white/15",
        "aria-invalid:ring-2 aria-invalid:ring-red-500/20",
        "md:text-[14px]",
        className
      )}
      {...props}
    />
  )
}

export { Input }