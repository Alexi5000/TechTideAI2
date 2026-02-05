/**
 * Agents Page
 *
 * Lists all agents from the registry organized by tier.
 * Users can navigate to the console to run individual agents.
 */

import { Link } from "react-router-dom";
import { useAgents } from "../hooks/use-agents";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import type { Agent } from "../lib/api-client";

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-[var(--ink)]">{agent.name}</h3>
        <Badge>{agent.tier}</Badge>
      </div>
      <p className="text-sm text-[var(--muted-strong)] mb-3">{agent.domain}</p>
      <p className="text-sm text-[var(--muted)] flex-grow mb-4">
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
      <Link to={`/console/${agent.id}`} className="mt-auto">
        <Button size="sm" className="w-full">
          Run Agent
        </Button>
      </Link>
    </Card>
  );
}

export function AgentsPage() {
  const { registry, loading, error, refetch } = useAgents();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-[var(--muted-strong)]">Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error.message}</p>
          <Button onClick={refetch}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!registry) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--stroke)] bg-[var(--surface-2)]">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-[var(--accent)]" />
              <span className="font-semibold">TechTideAI</span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/agents" className="text-sm font-medium text-[var(--ink)]">
              Agents
            </Link>
            <Link
              to="/runs"
              className="text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--ink)]"
            >
              Runs
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Agent Registry</h1>
          <p className="text-[var(--muted-strong)]">
            Browse and run AI agents across the organization hierarchy.
          </p>
        </div>

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
      </main>
    </div>
  );
}
