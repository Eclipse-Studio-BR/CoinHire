import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border transition-all duration-[180ms]",
          "bg-[var(--input-bg)] border-[var(--border-soft)] backdrop-blur-[14px]",
          "hover:bg-[var(--input-bg-hover)] hover:border-[rgba(255,255,255,0.12)]",
          "focus:bg-[var(--input-bg-focus)] focus:border-[rgba(255,255,255,0.18)]",
          "px-4 py-3 text-sm text-foreground",
          "placeholder:text-[var(--text-secondary)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
