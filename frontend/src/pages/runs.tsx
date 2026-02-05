/**
 * Runs Page
 *
 * Lists run history for the organization.
 */

import { Link } from "react-router-dom";
import { useRuns } from "../hooks/use-runs";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/status-badge";
import type { Run } from "../lib/api-client";

function RunCard({ run }: { run: Run }) {
  return (
    <Card className="flex items-center justify-between">
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
        <Link to={`/console/${run.agentId}`}>
          <Button size="sm" variant="ghost">
            View Agent
          </Button>
        </Link>
      )}
    </Card>
  );
}

export function RunsPage() {
  const { runs, loading, error, refetch } = useRuns();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-[var(--muted-strong)]">Loading runs...</div>
      </div>
    );
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
            <Link
              to="/agents"
              className="text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--ink)]"
            >
              Agents
            </Link>
            <Link to="/runs" className="text-sm font-medium text-[var(--ink)]">
              Runs
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Run History</h1>
            <p className="text-[var(--muted-strong)]">
              View past agent executions and their results.
            </p>
          </div>
          <Button onClick={refetch} variant="secondary">
            Refresh
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-red-700">{error.message}</p>
          </div>
        )}

        {runs.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-[var(--muted-strong)] mb-4">No runs yet.</p>
              <Link to="/agents">
                <Button>Run Your First Agent</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
