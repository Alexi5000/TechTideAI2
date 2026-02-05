/**
 * Tooltip Component
 *
 * Informational tooltip on hover/focus with configurable position and delay.
 *
 * @example
 * <Tooltip content="This is helpful information">
 *   <Button size="icon">
 *     <IconInfo />
 *   </Button>
 * </Tooltip>
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils.js";

interface TooltipProps {
  /** The content to display in the tooltip */
  content: React.ReactNode;
  /** The element that triggers the tooltip */
  children: React.ReactElement;
  /** Which side to show the tooltip */
  side?: "top" | "right" | "bottom" | "left";
  /** Delay before showing tooltip in ms */
  delayDuration?: number;
  /** Additional className for tooltip content */
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  delayDuration = 200,
  className,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculatePosition = React.useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const offset = 8;

    let top = 0;
    let left = 0;

    switch (side) {
      case "top":
        top = triggerRect.top - tooltipRect.height - offset;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "left":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - offset;
        break;
      case "right":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + offset;
        break;
    }

    // Ensure tooltip stays within viewport
    const padding = 8;
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));

    setPosition({ top, left });
  }, [side]);

  const showTooltip = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, delayDuration);
  }, [delayDuration]);

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(false);
  }, []);

  // Recalculate position when open
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure tooltip is rendered
      requestAnimationFrame(() => {
        calculatePosition();
      });
    }
  }, [open, calculatePosition]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clone child with event handlers
  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
      showTooltip();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
      hideTooltip();
    },
    onFocus: (e: React.FocusEvent) => {
      children.props.onFocus?.(e);
      showTooltip();
    },
    onBlur: (e: React.FocusEvent) => {
      children.props.onBlur?.(e);
      hideTooltip();
    },
  } as React.HTMLAttributes<HTMLElement> & { ref: React.RefObject<HTMLElement> });

  return (
    <>
      {trigger}
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={cn(
              "fixed z-[var(--z-toast)] px-3 py-1.5",
              "rounded-[var(--radius-md)] bg-[var(--ink)] text-[var(--bg)]",
              "text-xs font-medium shadow-[var(--shadow-md)]",
              "animate-fade-in pointer-events-none",
              className,
            )}
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
