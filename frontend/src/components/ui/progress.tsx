/**
 * Progress Component
 *
 * Linear progress bar for showing completion status.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-[var(--stroke)]",
  {
    variants: {
      size: {
        sm: "h-1",
        md: "h-2",
        lg: "h-3",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const progressIndicatorVariants = cva(
  "h-full rounded-full transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)]",
        success: "bg-[var(--success)]",
        warning: "bg-[var(--warning)]",
        error: "bg-[var(--error)]",
        info: "bg-[var(--info)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressIndicatorVariants> {
  /** Progress value from 0-100 */
  value?: number;
  /** Show indeterminate animation */
  indeterminate?: boolean;
  /** Show value label */
  showLabel?: boolean;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      size,
      variant,
      value = 0,
      indeterminate = false,
      showLabel = false,
      ...props
    },
    ref,
  ) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div className="w-full">
        {showLabel && (
          <div className="flex justify-between mb-1">
            <span className="text-xs text-[var(--muted-strong)]">Progress</span>
            <span className="text-xs font-medium text-[var(--ink)]">
              {Math.round(clampedValue)}%
            </span>
          </div>
        )}
        <div
          ref={ref}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn(progressVariants({ size }), className)}
          {...props}
        >
          <div
            className={cn(
              progressIndicatorVariants({ variant }),
              indeterminate && "animate-progress-indeterminate w-1/3",
            )}
            style={indeterminate ? undefined : { width: `${clampedValue}%` }}
          />
        </div>
      </div>
    );
  },
);

Progress.displayName = "Progress";
