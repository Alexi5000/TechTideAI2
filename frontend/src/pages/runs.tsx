/**
 * Runs Page
 *
 * Lists run history for the organization.
 */

import { Link, useOutletContext } from "react-router-dom";
import { useRuns } from "@/hooks/use-runs.js";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { StatusBadge } from "@/components/status-badge.js";
import { IconRefresh, IconHistory } from "@/components/icons/index.js";
import type { Run } from "@/lib/api-client.js";
import type { DashboardContextType } from "@/components/layout/index.js";

function RunCard({ run }: { run: Run }) {
  return (
    <Card className="flex items-center justify-between hover:shadow-[var(--shadow-md)] transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-mono text-sm text-[var(--muted-strong)] truncate">
            {run.id.substring(0, 8)}...
          </p>
          <StatusBadge status={run.status} />
        </div>
        <p className="text-sm text-[var(--muted)]">
          Agent: <span className="font-medium">{run.agentId ?? "Unknown"}</span>
        </p>
        <p className="text-xs text-[var(--muted)]">
          {new Date(run.createdAt).toLocaleString()}
        </p>
      </div>
      {run.agentId && (
        <Link to={`/dashboard/console/${run.agentId}`}>
          <Button size="sm" variant="ghost">
            View Agent
          </Button>
        </Link>
      )}
    </Card>
  );
}

function RunCardSkeleton() {
  return (
    <Card className="flex items-center justify-between animate-pulse">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-4 w-20 bg-[var(--stroke)] rounded" />
          <div className="h-5 w-16 bg-[var(--stroke)] rounded-full" />
        </div>
        <div className="h-4 w-32 bg-[var(--stroke)] rounded mb-1" />
        <div className="h-3 w-24 bg-[var(--stroke)] rounded" />
      </div>
      <div className="h-9 w-24 bg-[var(--stroke)] rounded-full" />
    </Card>
  );
}

export function RunsPage() {
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const { runs, loading, error, refetch } = useRuns();

  return (
    <PageTransition>
      <Topbar
        title="Run History"
        onMobileMenuToggle={onMobileMenuToggle}
        actions={
          <Button variant="ghost" onClick={refetch} aria-label="Refresh runs">
            <IconRefresh size={18} />
          </Button>
        }
      />

      <div className="p-6 max-w-[var(--content-max-width)] mx-auto">
        <p className="text-[var(--muted-strong)] mb-8">
          View past agent executions and their results.
        </p>

        {error && (
          <div className="p-4 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-lg mb-6">
            <p className="text-[var(--error)]">{error.message}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <RunCardSkeleton key={i} />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <EmptyState
            icon={<IconHistory size={48} />}
            title="No runs yet"
            description="Run your first agent to see execution history here."
            action={
              <Link to="/dashboard/agents">
                <Button>Run Your First Agent</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
