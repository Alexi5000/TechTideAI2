/**
 * 404 Not Found Page
 *
 * Displayed when user navigates to a route that doesn't exist.
 * Provides clear messaging and navigation back to dashboard.
 */

import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button.js";
import { Card } from "@/components/ui/card.js";
import { IconHome, IconArrowLeft } from "@/components/icons/index.js";

export function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
      <Card className="max-w-md w-full text-center">
        {/* Large 404 heading */}
        <div className="mb-6">
          <span className="text-8xl font-bold text-[var(--stroke)] font-display">
            404
          </span>
        </div>

        <h1 className="text-xl font-semibold text-[var(--ink)] mb-2">
          Page not found
        </h1>

        <p className="text-sm text-[var(--muted)] mb-2">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Show attempted path for debugging */}
        <p className="text-xs text-[var(--muted)] mb-6 font-mono bg-[var(--surface-2)] rounded-lg px-3 py-2 inline-block">
          {location.pathname}
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={() => window.history.back()}
            leftIcon={<IconArrowLeft size={16} />}
          >
            Go Back
          </Button>
          <Link to="/dashboard">
            <Button leftIcon={<IconHome size={16} />}>Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
