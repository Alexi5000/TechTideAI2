/**
 * Dashboard Home Page
 *
 * Overview page showing stats, recent activity, and quick actions.
 * This is a placeholder that will be enhanced in Phase 3.
 */

import { Link, useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Button } from "@/components/ui/button.js";
import { Card } from "@/components/ui/card.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { useAgents } from "@/hooks/use-agents.js";
import { useRuns } from "@/hooks/use-runs.js";
import {
  IconAgents,
  IconHistory,
  IconZap,
  IconActivity,
} from "@/components/icons/index.js";
import type { DashboardContextType } from "@/components/layout/index.js";

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <Card className="p-6 hover:shadow-[var(--shadow-md)] transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--muted)] mb-1">{label}</p>
          <p className="text-3xl font-semibold text-[var(--ink)]">{value}</p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
          {icon}
        </div>
      </div>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

export function DashboardHome() {
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const { registry, loading: agentsLoading } = useAgents();
  const { runs, loading: runsLoading } = useRuns();

  // Compute stats
  const totalAgents = registry
    ? 1 + registry.orchestrators.length + registry.workers.length
    : 0;

  const recentRuns = runs.slice(0, 5);
  const runningCount = runs.filter((r) => r.status === "running").length;
  const successRate =
    runs.length > 0
      ? Math.round(
          (runs.filter((r) => r.status === "succeeded").length / runs.length) * 100,
        )
      : 0;

  return (
    <PageTransition>
      <Topbar title="Dashboard" onMobileMenuToggle={onMobileMenuToggle} />

      <div className="p-6 max-w-[var(--content-max-width)] mx-auto">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            icon={<IconAgents size={24} />}
            label="Total Agents"
            value={agentsLoading ? "—" : totalAgents}
            href="/dashboard/agents"
          />
          <StatCard
            icon={<IconActivity size={24} />}
            label="Active Runs"
            value={runsLoading ? "—" : runningCount}
            href="/dashboard/runs"
          />
          <StatCard
            icon={<IconHistory size={24} />}
            label="Total Runs"
            value={runsLoading ? "—" : runs.length}
            href="/dashboard/runs"
          />
          <StatCard
            icon={<IconZap size={24} />}
            label="Success Rate"
            value={runsLoading ? "—" : `${successRate}%`}
          />
        </div>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {registry?.ceo && (
              <Link to={`/dashboard/console/${registry.ceo.id}`}>
                <Button>Run CEO Agent</Button>
              </Link>
            )}
            <Link to="/dashboard/agents">
              <Button variant="secondary">View All Agents</Button>
            </Link>
            <Link to="/dashboard/runs">
              <Button variant="secondary">View Run History</Button>
            </Link>
          </div>
        </section>

        {/* Recent Runs */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-4">Recent Runs</h2>
          {runsLoading ? (
            <p className="text-[var(--muted)]">Loading runs...</p>
          ) : recentRuns.length === 0 ? (
            <EmptyState
              icon={<IconHistory size={48} />}
              title="No runs yet"
              description="Run your first agent to see activity here."
              action={
                <Link to="/dashboard/agents">
                  <Button size="sm">Run Your First Agent</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <Card key={run.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        run.status === "succeeded"
                          ? "bg-[var(--success)]"
                          : run.status === "failed"
                            ? "bg-[var(--error)]"
                            : run.status === "running"
                              ? "bg-[var(--info)] animate-pulse"
                              : "bg-[var(--muted)]"
                      }`}
                    />
                    <span className="text-sm font-medium text-[var(--ink)]">
                      {run.agentId ?? "Unknown Agent"}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-[var(--muted-strong)] uppercase">
                    {run.status}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
