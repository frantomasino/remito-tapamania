import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-2 focus-visible:ring-white/15 aria-invalid:ring-2 aria-invalid:ring-red-500/20 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "border border-white/10 bg-[#1976d2] text-white font-semibold shadow-[0_8px_24px_rgba(25,118,210,0.18)] hover:bg-[#1c82e4]",
        destructive:
          "border border-[#ff6b6b]/20 bg-[#ff5a5f] text-white font-semibold hover:bg-[#ff6b6b]",
        outline:
          "border border-white/12 bg-transparent text-white hover:bg-white/5",
        secondary:
          "border border-white/10 bg-[#232326] text-white hover:bg-[#2a2a2d]",
        ghost:
          "text-white hover:bg-white/5",
        link:
          "h-auto rounded-none px-0 py-0 text-[#5aa9ff] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 text-sm has-[>svg]:px-3.5",
        sm: "h-9 rounded-xl px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 px-5 text-sm font-semibold has-[>svg]:px-4",
        icon: "h-10 w-10 rounded-2xl",
        "icon-sm": "h-9 w-9 rounded-xl",
        "icon-lg": "h-12 w-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }