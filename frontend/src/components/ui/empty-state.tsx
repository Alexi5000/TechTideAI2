/**
 * Empty State Component
 *
 * Placeholder for when there's no data to display.
 */

import * as React from "react";
import { cn } from "@/lib/utils.js";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Action button or link */
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-[var(--muted)] [&>svg]:h-12 [&>svg]:w-12">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--ink)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--muted)] max-w-sm mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
