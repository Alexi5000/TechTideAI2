/**
 * Dropdown Menu Component
 *
 * Action menu with keyboard navigation and positioning.
 *
 * @example
 * <DropdownMenu>
 *   <DropdownMenuTrigger asChild>
 *     <Button variant="ghost" size="icon">
 *       <IconMoreVertical />
 *     </Button>
 *   </DropdownMenuTrigger>
 *   <DropdownMenuContent align="end">
 *     <DropdownMenuLabel>Actions</DropdownMenuLabel>
 *     <DropdownMenuSeparator />
 *     <DropdownMenuItem onClick={() => console.log("Edit")}>
 *       Edit
 *     </DropdownMenuItem>
 *     <DropdownMenuItem onClick={() => console.log("Delete")} destructive>
 *       Delete
 *     </DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils.js";

// ============================================================================
// Context
// ============================================================================

interface DropdownMenuContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("DropdownMenu components must be used within a DropdownMenu");
  }
  return context;
}

// ============================================================================
// Dropdown Menu Root
// ============================================================================

interface DropdownMenuProps {
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function DropdownMenu({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const onOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      controlledOnOpenChange?.(newOpen);
    },
    [isControlled, controlledOnOpenChange],
  );

  return (
    <DropdownMenuContext.Provider value={{ open, onOpenChange, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

// ============================================================================
// Dropdown Menu Trigger
// ============================================================================

interface DropdownMenuTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
  const { open, onOpenChange, triggerRef } = useDropdownMenuContext();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(!open);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      onOpenChange(true);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: (el: HTMLButtonElement | null) => {
        (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
      },
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      "aria-expanded": open,
      "aria-haspopup": "menu",
    } as React.HTMLAttributes<HTMLElement> & { ref: (el: HTMLButtonElement | null) => void });
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-expanded={open}
      aria-haspopup="menu"
    >
      {children}
    </button>
  );
}

// ============================================================================
// Dropdown Menu Content
// ============================================================================

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alignment relative to trigger */
  align?: "start" | "center" | "end";
  /** Side relative to trigger */
  side?: "top" | "bottom";
  /** Offset from trigger in pixels */
  sideOffset?: number;
}

export function DropdownMenuContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 4,
  children,
  ...props
}: DropdownMenuContentProps) {
  const { open, onOpenChange, triggerRef } = useDropdownMenuContext();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [mounted, setMounted] = React.useState(false);

  // Calculate position
  React.useEffect(() => {
    if (!open || !triggerRef.current) return;

    const trigger = triggerRef.current;
    const rect = trigger.getBoundingClientRect();

    let top = side === "bottom" ? rect.bottom + sideOffset : rect.top - sideOffset;
    let left = rect.left;

    if (align === "end") {
      left = rect.right;
    } else if (align === "center") {
      left = rect.left + rect.width / 2;
    }

    setPosition({ top, left });
  }, [open, triggerRef, align, side, sideOffset]);

  // Mount after position calculated
  React.useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Keyboard navigation and close on click outside
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
        triggerRef.current?.focus();
      }

      // Arrow key navigation
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = contentRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])');
        if (!items?.length) return;

        const currentIndex = Array.from(items).findIndex(
          (item) => item === document.activeElement,
        );

        let nextIndex: number;
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }

        (items[nextIndex] as HTMLElement).focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    // Focus first item
    setTimeout(() => {
      const firstItem = contentRef.current?.querySelector('[role="menuitem"]:not([disabled])');
      (firstItem as HTMLElement)?.focus();
    }, 0);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange, triggerRef]);

  if (!mounted) return null;

  const alignmentStyles = {
    start: "left-0",
    center: "-translate-x-1/2",
    end: "right-0 -translate-x-full",
  };

  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "fixed z-[var(--z-dropdown)] min-w-[8rem] overflow-hidden",
        "rounded-[var(--radius-lg)] border border-[var(--stroke)]",
        "bg-[var(--surface-2)] p-1 shadow-[var(--shadow-lg)]",
        open ? "animate-fade-in" : "animate-fade-out",
        alignmentStyles[align],
        className,
      )}
      style={{
        top: position.top,
        left: align === "end" ? position.left : align === "center" ? position.left : position.left,
        transform: align === "center" ? "translateX(-50%)" : align === "end" ? "translateX(-100%)" : undefined,
      }}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

// ============================================================================
// Dropdown Menu Item
// ============================================================================

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Show destructive styling */
  destructive?: boolean;
  /** Leading icon */
  icon?: React.ReactNode;
}

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, destructive, icon, children, disabled, onClick, ...props }, ref) => {
    const { onOpenChange } = useDropdownMenuContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onClick?.(e);
      onOpenChange(false);
    };

    return (
      <button
        ref={ref}
        role="menuitem"
        type="button"
        disabled={disabled}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center gap-2",
          "rounded-[var(--radius-md)] px-3 py-2 text-sm outline-none",
          "transition-colors duration-[var(--duration-fast)]",
          "focus:bg-[var(--surface-1)] focus:text-[var(--ink)]",
          "hover:bg-[var(--surface-1)]",
          disabled && "pointer-events-none opacity-50",
          destructive
            ? "text-[var(--error)] focus:text-[var(--error)] hover:bg-[var(--error-light)]"
            : "text-[var(--ink)]",
          className,
        )}
        onClick={handleClick}
        {...props}
      >
        {icon && <span className="h-4 w-4">{icon}</span>}
        {children}
      </button>
    );
  },
);
DropdownMenuItem.displayName = "DropdownMenuItem";

// ============================================================================
// Dropdown Menu Separator
// ============================================================================

export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn("-mx-1 my-1 h-px bg-[var(--stroke)]", className)}
      {...props}
    />
  );
}

// ============================================================================
// Dropdown Menu Label
// ============================================================================

export function DropdownMenuLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-3 py-1.5 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide",
        className,
      )}
      {...props}
    />
  );
}
