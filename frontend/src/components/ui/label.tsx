/**
 * Label Component
 *
 * Form label with optional required indicator.
 */

import * as React from "react";
import { cn } from "@/lib/utils.js";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Show required asterisk */
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-sm font-medium text-[var(--ink)] mb-1.5",
          className,
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-[var(--error)] ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  },
);

Label.displayName = "Label";
