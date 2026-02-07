/**
 * Card Component
 *
 * Container card with compound components for structured content.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const cardVariants = cva(
  "rounded-[var(--radius-2xl)] border border-[var(--stroke)] bg-black/60 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "shadow-[var(--shadow-sm)]",
        elevated: "shadow-[var(--shadow-lg)]",
        outline: "shadow-none",
        ghost: "border-transparent bg-transparent shadow-none",
        glow: "border-[var(--accent)]/40 shadow-[0_0_15px_rgba(0,255,65,0.2)]",
      },
      interactive: {
        true: [
          "cursor-pointer",
          "transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)]",
          "hover:shadow-[0_0_20px_rgba(0,255,65,0.25)] hover:border-[var(--accent)]/30 hover:-translate-y-0.5",
        ].join(" "),
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

/**
 * Card root element
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive }), "p-6", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

/**
 * Card header section
 */
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/**
 * Card title
 */
export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-[var(--ink)]",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/**
 * Card description
 */
export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[var(--muted)]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/**
 * Card content section
 */
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

/**
 * Card footer section
 */
export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { cardVariants };
