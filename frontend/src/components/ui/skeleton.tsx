/**
 * Skeleton Component
 *
 * Loading placeholder with pulse animation.
 * Use to show content-aware placeholders while data loads.
 */

import { cn } from "@/lib/utils.js";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show the pulse animation */
  animate?: boolean;
  /** Use shimmer gradient animation instead of pulse */
  shimmer?: boolean;
}

/**
 * Base skeleton element - a pulsing placeholder
 *
 * @example
 * // Standard pulse animation
 * <Skeleton className="h-4 w-full" />
 *
 * // Shimmer gradient animation (more premium feel)
 * <Skeleton shimmer className="h-4 w-full" />
 */
export function Skeleton({
  className,
  animate = true,
  shimmer = false,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] bg-[var(--stroke)]",
        animate && !shimmer && "animate-pulse",
        shimmer && "animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

interface SkeletonTextProps {
  /** Number of lines to show */
  lines?: number;
  /** Width of last line (percentage or fixed) */
  lastLineWidth?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Multi-line text skeleton
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = "75%",
  className,
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{
            width: i === lines - 1 ? lastLineWidth : "100%",
          }}
        />
      ))}
    </div>
  );
}

interface SkeletonCircleProps {
  /** Size in pixels or CSS value */
  size?: number | string;
  /** Additional class names */
  className?: string;
}

/**
 * Circular skeleton for avatars
 */
export function SkeletonCircle({ size = 40, className }: SkeletonCircleProps) {
  const sizeStyle = typeof size === "number" ? `${size}px` : size;
  return (
    <Skeleton
      className={cn("rounded-full", className)}
      style={{ width: sizeStyle, height: sizeStyle }}
    />
  );
}

interface SkeletonCardProps {
  /** Show title line */
  showTitle?: boolean;
  /** Show avatar */
  showAvatar?: boolean;
  /** Number of body text lines */
  bodyLines?: number;
  /** Additional class names */
  className?: string;
}

/**
 * Card-shaped skeleton with optional title, avatar, and body
 */
export function SkeletonCard({
  showTitle = true,
  showAvatar = false,
  bodyLines = 2,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--stroke)] bg-[var(--surface-2)] p-6",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {showAvatar && <SkeletonCircle size={48} />}
        <div className="flex-1 space-y-3">
          {showTitle && <Skeleton className="h-6 w-1/2" />}
          <SkeletonText lines={bodyLines} />
        </div>
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Additional class names */
  className?: string;
}

/**
 * Table-shaped skeleton
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="flex gap-4 py-3 border-b border-[var(--stroke)]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${100 / columns}%` }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 py-4 border-b border-[var(--stroke)]"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className="h-4"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
