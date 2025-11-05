import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-xl border backdrop-blur-sm transition-smooth resize-none",
        "bg-[var(--input-bg)] border-[var(--stroke)]",
        "hover:bg-[var(--input-bg-hover)] focus:bg-[var(--input-bg-focus)]",
        "px-4 py-3 text-sm",
        "placeholder:text-muted-foreground",
        "focus-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
