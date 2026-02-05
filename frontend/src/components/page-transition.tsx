/**
 * Page Transition Component
 *
 * Wraps page content with fade-in animation on mount.
 * Provides consistent page entrance animation across the app.
 *
 * @example
 * <PageTransition>
 *   <Topbar title="Dashboard" />
 *   <div className="p-6">Content here</div>
 * </PageTransition>
 */

import * as React from "react";
import { cn } from "@/lib/utils.js";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={cn("animate-fade-in", className)}>{children}</div>;
}
