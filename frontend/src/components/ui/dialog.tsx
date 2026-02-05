/**
 * Dialog Component
 *
 * Modal dialog with backdrop, focus trap, and keyboard navigation.
 * Uses React Portal for proper z-index stacking.
 *
 * @example
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <DialogTrigger asChild>
 *     <Button>Open Dialog</Button>
 *   </DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Title</DialogTitle>
 *       <DialogDescription>Description</DialogDescription>
 *     </DialogHeader>
 *     <div>Content here</div>
 *     <DialogFooter>
 *       <DialogClose asChild>
 *         <Button variant="secondary">Cancel</Button>
 *       </DialogClose>
 *       <Button>Confirm</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";
import { IconX } from "@/components/icons/index.js";

// ============================================================================
// Context
// ============================================================================

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog");
  }
  return context;
}

// ============================================================================
// Dialog Root
// ============================================================================

interface DialogProps {
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled usage */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Dialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  children,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

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
    <DialogContext.Provider value={{ open, onOpenChange, contentRef }}>
      {children}
    </DialogContext.Provider>
  );
}

// ============================================================================
// Dialog Trigger
// ============================================================================

interface DialogTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

export function DialogTrigger({ children, asChild }: DialogTriggerProps) {
  const { onOpenChange } = useDialogContext();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}

// ============================================================================
// Dialog Portal & Overlay
// ============================================================================

interface DialogPortalProps {
  children: React.ReactNode;
}

function DialogPortal({ children }: DialogPortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}

function DialogOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange } = useDialogContext();

  return (
    <div
      className={cn(
        "fixed inset-0 z-[var(--z-modal)] bg-black/50 backdrop-blur-sm",
        "animate-fade-in",
        className,
      )}
      onClick={() => onOpenChange(false)}
      aria-hidden="true"
      {...props}
    />
  );
}

// ============================================================================
// Dialog Content
// ============================================================================

const dialogContentVariants = cva(
  [
    "fixed left-1/2 top-1/2 z-[var(--z-modal)] -translate-x-1/2 -translate-y-1/2",
    "w-full rounded-[var(--radius-2xl)] border border-[var(--stroke)]",
    "bg-[var(--surface-2)] p-6 shadow-[var(--shadow-xl)]",
    "animate-scale-in",
    "focus:outline-none",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        full: "max-w-[calc(100vw-2rem)]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

interface DialogContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dialogContentVariants> {
  /** Show close button in top right */
  showClose?: boolean;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, size, showClose = true, children, ...props }, forwardedRef) => {
    const { open, onOpenChange, contentRef } = useDialogContext();
    const internalRef = React.useRef<HTMLDivElement>(null);
    const ref = (forwardedRef ?? internalRef) as React.RefObject<HTMLDivElement>;

    // Sync internal ref
    React.useEffect(() => {
      if (ref.current) {
        (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = ref.current;
      }
    }, [ref, contentRef]);

    // Focus trap and keyboard handling
    React.useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onOpenChange(false);
        }
      };

      // Prevent body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      document.addEventListener("keydown", handleKeyDown);

      // Focus the dialog
      ref.current?.focus();

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }, [open, onOpenChange, ref]);

    if (!open) return null;

    return (
      <DialogPortal>
        <DialogOverlay />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(dialogContentVariants({ size }), className)}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {showClose && (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                "absolute right-4 top-4 rounded-full p-1.5",
                "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-1)]",
                "transition-colors duration-[var(--duration-fast)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              )}
              aria-label="Close dialog"
            >
              <IconX size={18} />
            </button>
          )}
          {children}
        </div>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = "DialogContent";

// ============================================================================
// Dialog Header, Title, Description
// ============================================================================

export const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}
    {...props}
  />
));
DialogHeader.displayName = "DialogHeader";

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-[var(--ink)]",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[var(--muted)]", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

// ============================================================================
// Dialog Footer
// ============================================================================

export const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6",
      className,
    )}
    {...props}
  />
));
DialogFooter.displayName = "DialogFooter";

// ============================================================================
// Dialog Close
// ============================================================================

interface DialogCloseProps {
  children: React.ReactElement;
  asChild?: boolean;
}

export function DialogClose({ children, asChild }: DialogCloseProps) {
  const { onOpenChange } = useDialogContext();

  const handleClick = () => {
    onOpenChange(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}
