/**
 * Route Error Boundary
 *
 * Catches errors within a single route/page without crashing
 * the entire app. Renders inline within the dashboard layout
 * so sidebar and navigation remain functional.
 */

import * as React from "react";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { IconAlertTriangle, IconRefresh } from "@/components/icons/index.js";

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

function RouteErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="p-6 max-w-[var(--content-max-width)] mx-auto">
      <Card className="p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-12 w-12 rounded-full bg-[var(--error-light)] flex items-center justify-center">
            <IconAlertTriangle size={24} className="text-[var(--error)]" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-[var(--ink)] mb-2">
          This page encountered an error
        </h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          {isDev && error
            ? error.message
            : "Something went wrong loading this page."}
        </p>
        <Button
          onClick={onReset}
          leftIcon={<IconRefresh size={16} />}
        >
          Try Again
        </Button>
      </Card>
    </div>
  );
}

export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Route error:", error, errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <RouteErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}
