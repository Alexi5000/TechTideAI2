/**
 * Toast Component
 *
 * Toast notification display with variants.
 * Use with useToast hook for state management.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";
import { IconX, IconCheck, IconAlert, IconInfo, IconAlertTriangle } from "@/components/icons/index.js";
import type { Toast as ToastType, ToastVariant } from "@/hooks/use-toast.js";

const toastVariants = cva(
  [
    "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-lg)]",
    "border transition-all",
    "animate-slide-in-bottom", // Enter animation
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-[var(--stroke)] bg-white text-[var(--ink)]",
        success:
          "border-[var(--success)]/20 bg-[var(--success-light)] text-[var(--success)]",
        error:
          "border-[var(--error)]/20 bg-[var(--error-light)] text-[var(--error)]",
        warning:
          "border-[var(--warning)]/20 bg-[var(--warning-light)] text-[var(--warning)]",
        info:
          "border-[var(--info)]/20 bg-[var(--info-light)] text-[var(--info)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  default: <IconInfo size={20} />,
  success: <IconCheck size={20} />,
  error: <IconAlertTriangle size={20} />,
  warning: <IconAlert size={20} />,
  info: <IconInfo size={20} />,
};

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  toast: ToastType;
  onDismiss?: ((id: string) => void) | undefined;
}

export function Toast({ toast, onDismiss, className, ...props }: ToastProps) {
  return (
    <div
      role="alert"
      className={cn(toastVariants({ variant: toast.variant }), className)}
      {...props}
    >
      <div className="flex-shrink-0">{VARIANT_ICONS[toast.variant]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="text-sm opacity-80 mt-0.5">{toast.description}</p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <IconX size={16} />
        </button>
      )}
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss?: ((id: string) => void) | undefined;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | undefined;
}

const positionClasses = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
};

export function ToastContainer({
  toasts,
  onDismiss,
  position = "bottom-right",
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed z-[var(--z-toast)] flex flex-col gap-2 w-full max-w-sm pointer-events-none",
        positionClasses[position],
      )}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
