/**
 * Toast Hook
 *
 * Simple toast notification system using React state.
 * Provides imperative API for showing toasts.
 */

import { useState, useCallback } from "react";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title: string;
  description: string | undefined;
  variant: ToastVariant;
  duration: number;
}

export interface ToastOptions {
  title: string;
  description?: string | undefined;
  variant?: ToastVariant;
  duration?: number;
}

let toastCounter = 0;

function generateId(): string {
  return `toast-${++toastCounter}-${Date.now()}`;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((options: ToastOptions) => {
    const id = generateId();
    const toast: Toast = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant ?? "default",
      duration: options.duration ?? 5000,
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss
    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const toast = useCallback(
    (title: string, description?: string | undefined) =>
      addToast({ title, description }),
    [addToast],
  );

  const success = useCallback(
    (title: string, description?: string | undefined) =>
      addToast({ title, description, variant: "success" }),
    [addToast],
  );

  const error = useCallback(
    (title: string, description?: string | undefined) =>
      addToast({ title, description, variant: "error" }),
    [addToast],
  );

  const warning = useCallback(
    (title: string, description?: string | undefined) =>
      addToast({ title, description, variant: "warning" }),
    [addToast],
  );

  const info = useCallback(
    (title: string, description?: string | undefined) =>
      addToast({ title, description, variant: "info" }),
    [addToast],
  );

  return {
    toasts,
    addToast,
    dismissToast,
    dismissAll,
    toast,
    success,
    error,
    warning,
    info,
  };
}
