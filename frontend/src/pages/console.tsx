/**
 * Console Page
 *
 * Agent execution console where users can run agents with custom input
 * and see real-time results.
 */

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAgent } from "../hooks/use-agents";
import { useAgentRun, useRunPolling } from "../hooks/use-runs";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { StatusBadge } from "../components/status-badge";

export function ConsolePage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { agent, loading: agentLoading, notFound } = useAgent(agentId);
  const { run, loading: runLoading, startRun, reset } = useAgentRun();
  const { run: polledRun, isPolling } = useRunPolling(run?.id ?? null);

  const [prompt, setPrompt] = useState("");

  const currentRun = polledRun ?? run;

  const handleRun = async () => {
    if (!agentId || !prompt.trim()) return;
    await startRun(agentId, { prompt: prompt.trim() });
  };

  const handleNewRun = () => {
    reset();
    setPrompt("");
  };

  if (agentLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-[var(--muted-strong)]">Loading agent...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--muted-strong)] mb-4">Agent not found: {agentId}</p>
          <Link to="/agents">
            <Button>Back to Agents</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--stroke)] bg-[var(--surface-2)]">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/agents" className="flex items-center gap-3">
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
            <Link
              to="/runs"
              className="text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--ink)]"
            >
              Runs
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Agent Info */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <Badge>{agent.tier}</Badge>
          </div>
          <p className="text-[var(--muted-strong)] mb-4">{agent.domain}</p>
          <p className="text-sm text-[var(--muted)]">{agent.mission}</p>
        </div>

        {/* Input Card */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Run Agent</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt or instructions for the agent..."
            disabled={runLoading || isPolling}
            className="w-full h-32 p-3 border border-[var(--stroke)] rounded-lg mb-4 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <div className="flex gap-3">
            <Button
              onClick={handleRun}
              disabled={runLoading || isPolling || !prompt.trim()}
              className="flex items-center gap-2"
            >
              {runLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Starting...
                </>
              ) : isPolling ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                "Run Agent"
              )}
            </Button>
            {currentRun && (
              <Button variant="secondary" onClick={handleNewRun}>
                New Run
              </Button>
            )}
          </div>
        </Card>

        {/* Result Card */}
        {currentRun && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Result</h2>
              <StatusBadge status={currentRun.status} />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">
                  Run ID
                </p>
                <p className="text-sm font-mono text-[var(--muted-strong)]">
                  {currentRun.id}
                </p>
              </div>

              {currentRun.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{currentRun.error}</p>
                </div>
              )}

              {currentRun.output && (
                <div>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">
                    Output
                  </p>
                  <pre className="p-3 bg-[var(--surface-1)] rounded-lg text-sm overflow-auto max-h-96">
                    {JSON.stringify(currentRun.output, null, 2)}
                  </pre>
                </div>
              )}

              {currentRun.finishedAt && (
                <div>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">
                    Completed
                  </p>
                  <p className="text-sm text-[var(--muted-strong)]">
                    {new Date(currentRun.finishedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Tools */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            Available Tools
          </h3>
          <div className="flex flex-wrap gap-2">
            {agent.tools.map((tool) => (
              <span
                key={tool}
                className="px-3 py-1 rounded-full bg-[var(--surface-1)] text-sm text-[var(--muted-strong)]"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
