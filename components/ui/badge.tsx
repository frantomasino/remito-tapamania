import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors [&>svg]:pointer-events-none [&>svg]:size-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 aria-invalid:ring-2 aria-invalid:ring-red-500/20",
  {
    variants: {
      variant: {
        default:
          "border border-[#2b8cff]/30 bg-[#1976d2] text-white [a&]:hover:bg-[#1c82e4]",
        secondary:
          "border border-white/10 bg-[#232326] text-[#d1d1d5] [a&]:hover:bg-[#2a2a2d]",
        destructive:
          "border border-[#ff6b6b]/20 bg-[#ff5a5f] text-white [a&]:hover:bg-[#ff6b6b]",
        outline:
          "border border-white/10 bg-transparent text-white [a&]:hover:bg-white/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }