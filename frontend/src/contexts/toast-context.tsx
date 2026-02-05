/**
 * Toast Context
 *
 * Provides toast notification functionality throughout the app.
 * Wraps the useToast hook in a context for global access.
 *
 * @example
 * // In a component
 * const { success, error } = useToastContext();
 * success("Saved!", "Your changes have been saved.");
 */

import * as React from "react";
import { useToast, type ToastOptions } from "@/hooks/use-toast.js";
import { ToastContainer } from "@/components/ui/toast.js";

interface ToastContextValue {
  /** Add a toast with custom options */
  addToast: (options: ToastOptions) => string;
  /** Dismiss a specific toast by ID */
  dismissToast: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Show a default toast */
  toast: (title: string, description?: string) => string;
  /** Show a success toast */
  success: (title: string, description?: string) => string;
  /** Show an error toast */
  error: (title: string, description?: string) => string;
  /** Show a warning toast */
  warning: (title: string, description?: string) => string;
  /** Show an info toast */
  info: (title: string, description?: string) => string;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: React.ReactNode;
  /** Position of toast container */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export function ToastProvider({
  children,
  position = "bottom-right",
}: ToastProviderProps) {
  const {
    toasts,
    addToast,
    dismissToast,
    dismissAll,
    toast,
    success,
    error,
    warning,
    info,
  } = useToast();

  const contextValue = React.useMemo<ToastContextValue>(
    () => ({
      addToast,
      dismissToast,
      dismissAll,
      toast,
      success,
      error,
      warning,
      info,
    }),
    [addToast, dismissToast, dismissAll, toast, success, error, warning, info],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} position={position} />
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
}
