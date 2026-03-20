import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:ring-2 aria-invalid:ring-destructive/20 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/25",
        outline:
          "bg-background text-foreground ring-1 ring-border/70 hover:bg-muted/40",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/85",
        ghost:
          "text-foreground hover:bg-muted/50",
        link:
          "h-auto rounded-none px-0 py-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 has-[>svg]:px-3.5",
        sm: "h-9 rounded-xl px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-12 px-5 text-[14px] has-[>svg]:px-4",
        icon: "size-11",
        "icon-sm": "size-9 rounded-xl",
        "icon-lg": "size-12",
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