import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        pulse: "bg-primary text-primary-foreground animate-pulse hover:animate-none shadow-lg shadow-primary/20",
        glass: "glass border-white/20 text-foreground",
        premium: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border-none shadow-sm",
        bronze: "bg-amber-600/20 text-amber-600 border-amber-600/30 dark:bg-amber-600/10 dark:text-amber-500",
        silver: "bg-slate-400/20 text-slate-400 border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300",
        gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400 font-bold",
        platinum: "bg-cyan-500/20 text-cyan-600 border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-400",
        diamond: "bg-blue-500/20 text-blue-600 border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 font-bold animate-glow-pulse",
      },

    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
