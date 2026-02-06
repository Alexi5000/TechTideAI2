/**
 * Agents Page
 *
 * Lists all agents from the registry organized by tier.
 * Users can navigate to the console to run individual agents.
 */

import { Link, useOutletContext } from "react-router-dom";
import { useAgents } from "@/hooks/use-agents.js";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { IconRefresh } from "@/components/icons/index.js";
import type { Agent } from "@/lib/api-client.js";
import type { DashboardContextType } from "@/components/layout/index.js";

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Card className="flex flex-col h-full hover:shadow-[var(--shadow-md)] transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-[var(--ink)]">{agent.name}</h3>
        <Badge>{agent.tier}</Badge>
      </div>
      <p className="text-sm text-[var(--muted-strong)] mb-3">{agent.domain}</p>
      <p
        className="text-sm text-[var(--muted)] flex-grow mb-4"
        title={agent.mission.length > 150 ? agent.mission : undefined}
      >
        {agent.mission.length > 150
          ? `${agent.mission.substring(0, 150)}...`
          : agent.mission}
      </p>
      <div className="flex flex-wrap gap-1 mb-4">
        {agent.tools.slice(0, 3).map((tool) => (
          <span
            key={tool}
            className="text-xs px-2 py-0.5 rounded bg-[var(--surface-1)] text-[var(--muted-strong)]"
          >
            {tool}
          </span>
        ))}
        {agent.tools.length > 3 && (
          <span className="text-xs text-[var(--muted)]">
            +{agent.tools.length - 3} more
          </span>
        )}
      </div>
      <Link to={`/dashboard/console/${agent.id}`} className="mt-auto">
        <Button size="sm" className="w-full">
          Run Agent
        </Button>
      </Link>
    </Card>
  );
}

function AgentCardSkeleton() {
  return (
    <Card className="flex flex-col h-full animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-6 w-32 bg-[var(--stroke)] rounded" />
        <div className="h-5 w-16 bg-[var(--stroke)] rounded-full" />
      </div>
      <div className="h-4 w-24 bg-[var(--stroke)] rounded mb-3" />
      <div className="space-y-2 flex-grow mb-4">
        <div className="h-4 w-full bg-[var(--stroke)] rounded" />
        <div className="h-4 w-3/4 bg-[var(--stroke)] rounded" />
      </div>
      <div className="flex gap-1 mb-4">
        <div className="h-5 w-16 bg-[var(--stroke)] rounded" />
        <div className="h-5 w-16 bg-[var(--stroke)] rounded" />
      </div>
      <div className="h-9 w-full bg-[var(--stroke)] rounded-full" />
    </Card>
  );
}

export function AgentsPage() {
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const { registry, loading, error, refetch } = useAgents();

  if (error) {
    return (
      <PageTransition>
        <Topbar title="Agent Registry" onMobileMenuToggle={onMobileMenuToggle} />
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-[var(--error)] mb-4">Error: {error.message}</p>
            <Button onClick={refetch}>Retry</Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Topbar
        title="Agent Registry"
        onMobileMenuToggle={onMobileMenuToggle}
        actions={
          <Button variant="ghost" onClick={refetch} aria-label="Refresh agents">
            <IconRefresh size={18} />
          </Button>
        }
      />

      <div className="p-6 max-w-[var(--content-max-width)] mx-auto">
        <p className="text-[var(--muted-strong)] mb-8">
          Browse and run AI agents across the organization hierarchy.
        </p>

        {loading ? (
          <>
            {/* CEO Skeleton */}
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                CEO
              </h2>
              <div className="max-w-md">
                <AgentCardSkeleton />
              </div>
            </section>

            {/* Orchestrators Skeleton */}
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-teal-500" />
                Orchestrators
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <AgentCardSkeleton key={i} />
                ))}
              </div>
            </section>

            {/* Workers Skeleton */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Workers
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <AgentCardSkeleton key={i} />
                ))}
              </div>
            </section>
          </>
        ) : registry ? (
          <>
            {/* CEO */}
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                CEO
              </h2>
              <div className="max-w-md">
                <AgentCard agent={registry.ceo} />
              </div>
            </section>

            {/* Orchestrators */}
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-teal-500" />
                Orchestrators ({registry.orchestrators.length})
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {registry.orchestrators.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </section>

            {/* Workers */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Workers ({registry.workers.length})
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {registry.workers.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </PageTransition>
  );
}
