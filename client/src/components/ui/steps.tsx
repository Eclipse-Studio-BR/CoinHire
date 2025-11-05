import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Step {
  title: string
  description?: string
}

export interface StepsProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function Steps({ steps, currentStep, className }: StepsProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isUpcoming = stepNumber > currentStep

          return (
            <li
              key={index}
              className={cn(
                "relative flex flex-1 flex-col items-center",
                index !== steps.length - 1 && "pr-8 sm:pr-20"
              )}
            >
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[calc(50%+1.5rem)] top-5 h-0.5 w-full transition-smooth",
                    isCompleted ? "bg-primary" : "bg-white/20"
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Step indicator */}
              <div className="relative flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-pill text-sm font-semibold transition-smooth",
                    isCompleted &&
                      "bg-primary text-primary-foreground shadow-md",
                    isCurrent &&
                      "border-2 border-primary bg-white/10 text-primary shadow-glass",
                    isUpcoming &&
                      "border border-white/20 bg-white/5 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Step info */}
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span
                    className={cn(
                      "text-sm font-medium transition-smooth",
                      isCurrent && "text-foreground",
                      isCompleted && "text-foreground",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Responsive compact version for mobile
export interface StepsCompactProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function StepsCompact({ steps, currentStep, className }: StepsCompactProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Step {currentStep} of {steps.length}
        </span>
        <div className="flex-1 h-2 bg-white/10 rounded-pill overflow-hidden">
          <div
            className="h-full bg-primary transition-smooth rounded-pill"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-base font-semibold text-foreground">
          {steps[currentStep - 1]?.title}
        </p>
        {steps[currentStep - 1]?.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {steps[currentStep - 1].description}
          </p>
        )}
      </div>
    </div>
  )
}
