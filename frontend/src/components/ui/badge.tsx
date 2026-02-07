/**
 * Badge Component
 *
 * Inline badge for labels, tags, and status indicators.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]",
        success:
          "border-[var(--success)]/20 bg-[var(--success-light)] text-[var(--success)]",
        warning:
          "border-[var(--warning)]/20 bg-[var(--warning-light)] text-[var(--warning)]",
        error:
          "border-[var(--error)]/20 bg-[var(--error-light)] text-[var(--error)]",
        info:
          "border-[var(--info)]/20 bg-[var(--info-light)] text-[var(--info)]",
        outline:
          "border-[var(--stroke)] bg-transparent text-[var(--muted-strong)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Show a dot indicator before the text */
  dot?: boolean;
  /** Dot color (defaults to current text color) */
  dotColor?: string;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, dot, dotColor, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      >
        {dot && (
          <span
            className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current"
            style={dotColor ? { backgroundColor: dotColor } : undefined}
          />
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export { badgeVariants };
