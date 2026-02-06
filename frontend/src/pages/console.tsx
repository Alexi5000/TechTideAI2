/**
 * Console Page
 *
 * Agent execution console where users can run agents with custom input
 * and see real-time results.
 */

import { useState } from "react";
import { useParams, Link, useOutletContext } from "react-router-dom";
import { useAgent } from "@/hooks/use-agents.js";
import { useAgentRun, useRunEvents, useRunPolling } from "@/hooks/use-runs.js";
import { useToastContext } from "@/contexts/toast-context.js";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { StatusBadge } from "@/components/status-badge.js";
import { IconLoader, IconPlay, IconRefresh } from "@/components/icons/index.js";
import { apiClient } from "@/lib/api-client.js";
import type { DashboardContextType } from "@/components/layout/index.js";

function ConsoleSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-48 bg-[var(--stroke)] rounded" />
          <div className="h-5 w-16 bg-[var(--stroke)] rounded-full" />
        </div>
        <div className="h-4 w-32 bg-[var(--stroke)] rounded mb-4" />
        <div className="h-4 w-full bg-[var(--stroke)] rounded" />
      </div>
      <Card className="mb-6">
        <div className="h-6 w-24 bg-[var(--stroke)] rounded mb-4" />
        <div className="h-32 w-full bg-[var(--stroke)] rounded mb-4" />
        <div className="h-11 w-32 bg-[var(--stroke)] rounded-full" />
      </Card>
    </div>
  );
}

export function ConsolePage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const { agent, loading: agentLoading, notFound } = useAgent(agentId);
  const { run, loading: runLoading, startRun, reset } = useAgentRun();
  const { run: polledRun, isPolling } = useRunPolling(run?.id ?? null);
  const { events, loading: eventsLoading, error: eventsError } = useRunEvents(
    polledRun?.id ?? run?.id ?? null,
    polledRun?.status ?? run?.status ?? null,
  );
  const { success, error: toastError } = useToastContext();

  const [prompt, setPrompt] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const currentRun = polledRun ?? run;
  const isTerminal =
    currentRun?.status === "succeeded" ||
    currentRun?.status === "failed" ||
    currentRun?.status === "canceled";

  const handleRun = async () => {
    // Guard: don't submit if agent not loaded or invalid
    if (!agentId || !agent || agentLoading || notFound) return;
    if (!prompt.trim()) return;
    try {
      await startRun(agentId, { prompt: prompt.trim() });
      success("Run started", `Agent ${agent.name} is processing your request.`);
    } catch (err) {
      toastError("Run failed", err instanceof Error ? err.message : "Could not start agent run.");
    }
  };

  const handleNewRun = () => {
    reset();
    setPrompt("");
  };

  const handleCancel = async () => {
    if (!currentRun || isTerminal) return;
    setCancelLoading(true);
    try {
      await apiClient.cancelRun(currentRun.id);
      success("Run canceled", "Cancellation request sent.");
    } catch (err) {
      toastError(
        "Cancel failed",
        err instanceof Error ? err.message : "Unable to cancel run.",
      );
    } finally {
      setCancelLoading(false);
    }
  };

  const formatEventLabel = (value: string) =>
    value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const formatPayload = (payload: Record<string, unknown>) => {
    const text = JSON.stringify(payload);
    return text.length > 160 ? `${text.slice(0, 160)}...` : text;
  };

  if (notFound) {
    return (
      <PageTransition>
        <Topbar title="Console" onMobileMenuToggle={onMobileMenuToggle} />
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-[var(--muted-strong)] mb-4">Agent not found: {agentId}</p>
            <Link to="/dashboard/agents">
              <Button>Back to Agents</Button>
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Topbar
        title={agent?.name ?? "Console"}
        onMobileMenuToggle={onMobileMenuToggle}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Console" },
          ...(agent ? [{ label: agent.name }] : []),
        ]}
      />

      <div className="p-6 max-w-4xl mx-auto">
        {agentLoading ? (
          <ConsoleSkeleton />
        ) : agent ? (
          <>
            {/* Agent Info */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-[var(--ink)]">{agent.name}</h2>
                <Badge>{agent.tier}</Badge>
              </div>
              <p className="text-[var(--muted-strong)] mb-4">{agent.domain}</p>
              <p className="text-sm text-[var(--muted)]">{agent.mission}</p>
            </div>

            {/* Input Card */}
            <Card className="mb-6">
              <label htmlFor="agent-prompt" className="text-lg font-semibold mb-4 block">
                Run Agent
              </label>
              <textarea
                id="agent-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt or instructions for the agent..."
                disabled={runLoading || isPolling}
                className="w-full h-32 p-3 border border-[var(--stroke)] rounded-lg mb-4 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:bg-[var(--surface-1)] disabled:cursor-not-allowed transition-shadow"
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleRun}
                  disabled={runLoading || isPolling || !prompt.trim() || agentLoading || !agent}
                  className="flex items-center gap-2"
                >
                  {runLoading ? (
                    <>
                      <IconLoader size={16} className="animate-spin" />
                      Starting...
                    </>
                  ) : isPolling ? (
                    <>
                      <IconLoader size={16} className="animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <IconPlay size={16} />
                      Run Agent
                    </>
                  )}
                </Button>
                {currentRun && !isTerminal && (
                  <Button variant="secondary" onClick={handleCancel} disabled={cancelLoading}>
                    {cancelLoading ? "Canceling..." : "Cancel Run"}
                  </Button>
                )}
                {currentRun && (
                  <Button variant="secondary" onClick={handleNewRun}>
                    <IconRefresh size={16} className="mr-2" />
                    New Run
                  </Button>
                )}
              </div>
            </Card>

            {/* Result Card */}
            {currentRun && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Result</h3>
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
                    <div className="p-3 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-lg">
                      <p className="text-sm text-[var(--error)]">{currentRun.error}</p>
                    </div>
                  )}

                  {currentRun.output && (
                    <div>
                      <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">
                        Output
                      </p>
                      <pre className="p-3 bg-[var(--surface-1)] rounded-lg text-sm overflow-auto max-h-96 font-mono">
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

            {currentRun && (
              <Card className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Execution Timeline</h3>
                  <span className="text-xs text-[var(--muted)]">
                    {eventsLoading ? "Updating..." : `${events.length} events`}
                  </span>
                </div>
                {eventsError && (
                  <p className="text-sm text-[var(--error)] mb-3">{eventsError.message}</p>
                )}
                {events.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No events recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div key={event.id} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[var(--ink)]">
                            {formatEventLabel(event.eventType)}
                          </span>
                          <span className="text-xs text-[var(--muted)]">
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted-strong)] mt-1">
                          {formatPayload(event.payload)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
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
          </>
        ) : null}
      </div>
    </PageTransition>
  );
}
