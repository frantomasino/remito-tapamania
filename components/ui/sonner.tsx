"use client"

import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-2xl border border-white/10 bg-[#1b1b1d] text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
          title: "text-sm font-medium text-white",
          description: "text-sm text-[#b0b0b6]",
          actionButton:
            "h-9 rounded-xl border border-white/10 bg-[#1976d2] px-3 text-xs font-medium text-white hover:bg-[#1c82e4]",
          cancelButton:
            "h-9 rounded-xl border border-white/10 bg-transparent px-3 text-xs font-medium text-white hover:bg-white/5",
          closeButton:
            "rounded-xl text-[#b0b0b6] hover:bg-white/5 hover:text-white",
        },
      }}
      style={
        {
          "--normal-bg": "#1b1b1d",
          "--normal-text": "#ffffff",
          "--normal-border": "rgba(255,255,255,0.1)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }