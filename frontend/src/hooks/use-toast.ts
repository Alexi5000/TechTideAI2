/**
 * Toast Hook
 *
 * Simple toast notification system using React state.
 * Provides imperative API for showing toasts.
 */

import { useState, useCallback, useRef, useEffect } from "react";

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
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Clear all auto-dismiss timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timeout of timers.values()) {
        clearTimeout(timeout);
      }
      timers.clear();
    };
  }, []);

  // Structurally necessary: these useCallback wrappers stabilize the
  // ToastContext.Provider value via useMemo in ToastProvider (toast-context.tsx),
  // preventing all useToastContext() consumers from re-rendering on every toast change.
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

    // Auto-dismiss with tracked timeout
    if (toast.duration > 0) {
      const timeout = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration);
      timersRef.current.set(id, timeout);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timeout = timersRef.current.get(id);
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    for (const timeout of timersRef.current.values()) {
      clearTimeout(timeout);
    }
    timersRef.current.clear();
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
