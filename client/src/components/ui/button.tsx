import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-[180ms] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary-border rounded-pill shadow-[var(--shadow-glass-1)] hover:shadow-[var(--shadow-glass-2)] hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border rounded-pill shadow-[var(--shadow-glass-1)] hover:shadow-[var(--shadow-glass-2)] hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border border-[var(--border-soft)] rounded-pill shadow-[var(--shadow-glass)] hover:bg-white/8 hover:border-[rgba(255,255,255,0.12)] active:bg-white/12",
        secondary:
          "bg-[var(--glass-1)] text-foreground border border-[var(--border-soft)] rounded-pill backdrop-blur-md hover:bg-[var(--glass-2)] hover:shadow-[var(--shadow-glass)] active:bg-[var(--glass-3)]",
        ghost:
          "border border-transparent rounded-xl hover:bg-white/6 active:bg-white/10",
        glass:
          "btn-glass rounded-pill text-foreground hover:scale-[1.02] active:scale-[0.98]",
      },
      size: {
        default: "min-h-10 px-5 py-2.5 text-sm",
        sm: "min-h-8 px-4 py-2 text-xs",
        lg: "min-h-12 px-8 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
