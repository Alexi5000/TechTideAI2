/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the entire app.
 *
 * Must be a class component - React's componentDidCatch has no hooks equivalent.
 */

import * as React from "react";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { IconAlertTriangle, IconRefresh } from "@/components/icons/index.js";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback UI - if not provided, uses DefaultErrorFallback */
  fallback?: React.ReactNode;
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

/**
 * Default error fallback UI
 * Shows error message in dev, generic message in prod
 */
function DefaultErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
      <Card className="max-w-md w-full text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-16 w-16 rounded-full bg-[var(--error-light)] flex items-center justify-center">
            <IconAlertTriangle size={32} className="text-[var(--error)]" />
          </div>
        </div>

        <h1 className="text-xl font-semibold text-[var(--ink)] mb-2">
          Something went wrong
        </h1>

        <p className="text-sm text-[var(--muted)] mb-6">
          {isDev && error
            ? error.message
            : "An unexpected error occurred. Please try again."}
        </p>

        {isDev && error?.stack && (
          <pre className="text-xs text-left bg-[var(--surface-2)] p-3 rounded-lg mb-6 overflow-auto max-h-40 text-[var(--muted)]">
            {error.stack}
          </pre>
        )}

        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
            leftIcon={<IconRefresh size={16} />}
          >
            Reload Page
          </Button>
          <Button onClick={onReset}>Try Again</Button>
        </div>
      </Card>
    </div>
  );
}

/**
 * Error Boundary wrapper component
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    // In production, this could send to an error tracking service
    console.error("Error caught by ErrorBoundary:", error);
    console.error("Component stack:", errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
