/**
 * Page Skeleton Component
 *
 * Full-page loading skeleton for React.lazy() suspense fallback.
 */

import { Skeleton, SkeletonText } from "./ui/skeleton.js";

export function PageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Topbar skeleton */}
      <div className="h-[var(--header-height)] flex items-center justify-between px-6 border-b border-[var(--stroke)] bg-[var(--surface-2)]">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      {/* Content skeleton */}
      <div className="p-6 max-w-[var(--content-max-width)] mx-auto">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-xl)] border border-[var(--stroke)] bg-[var(--surface-2)] p-6"
            >
              <Skeleton className="h-6 w-1/2 mb-3" />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
