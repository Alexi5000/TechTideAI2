/**
 * Runs Page
 *
 * Lists run history for the organization.
 */

import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAgents } from "@/hooks/use-agents.js";
import { useRuns } from "@/hooks/use-runs.js";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { Select } from "@/components/ui/select.js";
import { StatusBadge } from "@/components/status-badge.js";
import { IconRefresh, IconHistory } from "@/components/icons/index.js";
import type { Run, RunStatus } from "@/lib/api-client.js";
import type { DashboardContextType } from "@/components/layout/index.js";

function formatDuration(run: Run) {
  if (!run.startedAt || !run.finishedAt) return "—";
  const durationMs =
    new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
  if (durationMs <= 0 || Number.isNaN(durationMs)) return "—";
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function RunCard({ run, agentName }: { run: Run; agentName: string | undefined }) {
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
          Agent:{" "}
          {run.agentId ? (
            <span className="font-medium">{agentName ?? run.agentId}</span>
          ) : (
            <span className="italic text-[var(--muted)]">System Run</span>
          )}
        </p>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span>{new Date(run.createdAt).toLocaleString()}</span>
          <span>Duration: {formatDuration(run)}</span>
        </div>
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
  const { registry } = useAgents();
  const [statusFilter, setStatusFilter] = useState<RunStatus | "all">("all");

  const agentLookup = new Map<string, string>();
  if (registry) {
    agentLookup.set(registry.ceo.id, registry.ceo.name);
    registry.orchestrators.forEach((agent) => agentLookup.set(agent.id, agent.name));
    registry.workers.forEach((agent) => agentLookup.set(agent.id, agent.name));
  }

  const filteredRuns =
    statusFilter === "all" ? runs : runs.filter((run) => run.status === statusFilter);

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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="text-sm text-[var(--muted)]">
            Showing {filteredRuns.length} run{filteredRuns.length === 1 ? "" : "s"}
          </div>
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as RunStatus | "all")}
            className="sm:w-48"
          >
            <option value="all">All statuses</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="canceled">Canceled</option>
          </Select>
        </div>

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
        ) : filteredRuns.length === 0 ? (
          runs.length === 0 ? (
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
            <EmptyState
              icon={<IconHistory size={48} />}
              title="No runs match that status"
              description="Try a different status filter to see runs."
            />
          )
        ) : (
          <div className="space-y-4">
            {filteredRuns.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                agentName={run.agentId ? agentLookup.get(run.agentId) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
