import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-smooth focus-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary-border rounded-pill shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border rounded-pill shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border [border-color:var(--button-outline)] rounded-pill shadow-xs hover:bg-white/5 active:bg-white/10",
        secondary:
          "bg-secondary text-secondary-foreground border border-secondary-border rounded-pill shadow-xs hover:bg-white/5 active:bg-white/10",
        ghost:
          "border border-transparent rounded-xl hover:bg-white/5 active:bg-white/10",
        glass:
          "glass rounded-pill text-foreground shadow-glass hover:shadow-glass-lg hover:scale-[1.02] active:scale-[0.98]",
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
