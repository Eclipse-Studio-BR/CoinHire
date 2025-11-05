import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-[180ms] focus:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring)]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-glass-1)]",
        secondary:
          "border-transparent bg-[var(--glass-2)] text-foreground backdrop-blur-md",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-[var(--shadow-glass-1)]",
        outline:
          "border border-[var(--border-soft)] bg-[var(--glass-1)] backdrop-blur-md text-foreground",
        glass:
          "border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.06)] backdrop-blur-[14px] text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
