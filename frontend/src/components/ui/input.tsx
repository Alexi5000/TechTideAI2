/**
 * Input Component
 *
 * Text input with consistent styling and error state support.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const inputVariants = cva(
  [
    "w-full rounded-[var(--radius-lg)] border bg-black/50 px-4 font-medium transition-all",
    "placeholder:text-[var(--muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]",
    "disabled:cursor-not-allowed disabled:bg-[var(--surface-1)] disabled:opacity-60",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-9 text-sm",
        md: "h-11 text-sm",
        lg: "h-12 text-base",
      },
      variant: {
        default: "border-[var(--stroke)] text-[var(--ink)]",
        error: "border-[var(--error)] text-[var(--ink)] focus:ring-[var(--error)]",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  /** Icon to show on the left side */
  leftIcon?: React.ReactNode;
  /** Icon to show on the right side */
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, variant, leftIcon, rightIcon, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              inputVariants({ size, variant }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              {rightIcon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(inputVariants({ size, variant }), className)}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
