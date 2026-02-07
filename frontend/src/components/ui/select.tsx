/**
 * Select Component
 *
 * Native select with consistent styling.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";
import { IconChevronDown } from "@/components/icons/index.js";

const selectVariants = cva(
  [
    "w-full appearance-none rounded-[var(--radius-lg)] border bg-black/50 px-4 pr-10 font-medium transition-all",
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

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {
  /** Placeholder text shown when no value selected */
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, size, variant, placeholder, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(selectVariants({ size, variant }), className)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          <IconChevronDown size={16} />
        </div>
      </div>
    );
  },
);

Select.displayName = "Select";
