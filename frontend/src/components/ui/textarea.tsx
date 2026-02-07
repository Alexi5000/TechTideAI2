/**
 * Textarea Component
 *
 * Multi-line text input with consistent styling.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const textareaVariants = cva(
  [
    "w-full rounded-[var(--radius-lg)] border bg-black/50 px-4 py-3 font-medium transition-all resize-none",
    "placeholder:text-[var(--muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]",
    "disabled:cursor-not-allowed disabled:bg-[var(--surface-1)] disabled:opacity-60",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border-[var(--stroke)] text-[var(--ink)]",
        error: "border-[var(--error)] text-[var(--ink)] focus:ring-[var(--error)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  /** Show character count */
  showCount?: boolean;
  /** Maximum character count */
  maxLength?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, showCount, maxLength, value, ...props }, ref) => {
    const charCount = typeof value === "string" ? value.length : 0;

    return (
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={cn(
            textareaVariants({ variant }),
            showCount && "pb-8",
            className,
          )}
          {...props}
        />
        {showCount && maxLength && (
          <div className="absolute bottom-2 right-3 text-xs text-[var(--muted)]">
            {charCount}/{maxLength}
          </div>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
