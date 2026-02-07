/**
 * Button Component
 *
 * Primary action button with variants and loading state.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";
import { IconLoader } from "@/components/icons/index.js";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
    "disabled:pointer-events-none disabled:opacity-60",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] text-black shadow-[0_0_20px_rgba(0,255,65,0.4)] hover:translate-y-[-1px] hover:shadow-[0_0_30px_rgba(0,255,65,0.6)]",
        secondary:
          "bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--stroke)] hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)]",
        ghost: "bg-transparent text-[var(--ink)] hover:bg-[var(--surface-1)] hover:text-[var(--accent)]",
        destructive:
          "bg-[var(--error)] text-white hover:bg-[var(--error)]/90",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-6",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show loading spinner and disable interactions */
  loading?: boolean;
  /** Icon to show before children */
  leftIcon?: React.ReactNode;
  /** Icon to show after children */
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <IconLoader size={16} className="animate-spin" />
            {children}
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export { buttonVariants };
