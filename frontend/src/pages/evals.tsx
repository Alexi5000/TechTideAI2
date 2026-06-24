/**
 * Evals Page
 *
 * Eval harness operator surface. Shows suite summaries, recent runs with
 * sparkline-style pass-rate deltas, and a "Run now" trigger.
 */

import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { useEvalRuns } from "@/hooks/use-eval-runs.js";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { Select } from "@/components/ui/select.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { IconRefresh, IconBolt, IconChecklist } from "@/components/icons/index.js";
import type { EvalRun } from "@/lib/api-client.js";
import type { DashboardContextType } from "@/components/layout/index.js";

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function SummaryCard({ run }: { run: EvalRun }) {
  const summary = run.summary;
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-mono text-sm text-[var(--muted-strong)]">{run.id.substring(0, 8)}…</p>
          <p className="text-xs text-[var(--muted)]">
            {run.suiteId} @ {run.suiteVersion} · {new Date(run.startedAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={run.status === "succeeded" ? "success" : run.status === "failed" ? "error" : "default"}>
          {run.status}
        </Badge>
      </div>
      {summary ? (
        <div className="grid grid-cols-4 gap-3 mt-4">
          <Metric label="Pass rate" value={formatPct(summary.passRate)} />
          <Metric label="Mean score" value={summary.meanScore.toFixed(2)} />
          <Metric label="p95 latency" value={`${summary.p95LatencyMs}ms`} />
          <Metric label="Cost" value={`$${summary.totalCostUsd.toFixed(3)}`} />
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">No summary available.</p>
      )}
      {summary?.regressionDeltaPct !== null && summary?.regressionDeltaPct !== undefined ? (
        <p className={`mt-3 text-sm ${summary.regressionDeltaPct < 0 ? "text-[var(--error)]" : "text-[var(--muted)]"}`}>
          {summary.regressionDeltaPct >= 0 ? "+" : ""}
          {summary.regressionDeltaPct.toFixed(1)}% vs baseline
        </p>
      ) : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-base font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function TaskBreakdown({ run }: { run: EvalRun }) {
  return (
    <Card>
      <p className="font-semibold text-[var(--ink)] mb-3">Task breakdown</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--stroke)]">
              <th className="py-2 pr-3">Task</th>
              <th className="py-2 pr-3">Score</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Latency</th>
              <th className="py-2 pr-3">Top reason</th>
            </tr>
          </thead>
          <tbody>
            {run.taskResults.map((r) => (
              <tr key={r.taskId} className="border-b border-[var(--stroke)]/50">
                <td className="py-2 pr-3 font-mono text-xs">{r.taskId}</td>
                <td className="py-2 pr-3">{r.score.toFixed(2)}</td>
                <td className="py-2 pr-3">
                  <Badge variant={r.passed ? "success" : "error"}>{r.passed ? "PASS" : "FAIL"}</Badge>
                </td>
                <td className="py-2 pr-3">{r.latencyMs}ms</td>
                <td className="py-2 pr-3 text-[var(--muted)] truncate max-w-[420px]">
                  {r.failureReason ?? ", "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function EvalsPage() {
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const { runs, suites, loading, running, error, refetch, triggerRun } = useEvalRuns();
  const [suiteId, setSuiteId] = useState<string>("golden-tasks.v1");
  const [baseline, setBaseline] = useState<string>("latest");

  const suiteOptions = useMemo(() => {
    if (suites.length === 0) return [{ value: "golden-tasks.v1", label: "golden-tasks.v1" }];
    return suites.map((s) => ({
      value: `${s.id}.${s.version.replace(/^v/, "")}`,
      label: `${s.id} (${s.taskCount} tasks)`,
    }));
  }, [suites]);

  const latestRun = runs[0];

  return (
    <PageTransition>
      <Topbar
        title="Eval Harness"
        onMobileMenuToggle={onMobileMenuToggle}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={refetch} aria-label="Refresh">
              <IconRefresh size={18} />
            </Button>
            <Button onClick={() => triggerRun({ suite: suiteId, baseline })} disabled={running}>
              <IconBolt size={16} />
              {running ? "Running…" : "Run suite"}
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-[var(--content-max-width)] mx-auto space-y-6">
        <p className="text-[var(--muted-strong)]">
          Run the eval harness, inspect per-task scoring breakdowns, and detect regressions against the
          published baseline. See <code>docs/EVALS.md</code> for methodology.
        </p>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[var(--muted)]" htmlFor="suite-select">Suite</label>
              <Select
                id="suite-select"
                value={suiteId}
                onChange={(e) => setSuiteId(e.target.value)}
              >
                {suiteOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm text-[var(--muted)]" htmlFor="baseline-select">Baseline</label>
              <Select
                id="baseline-select"
                value={baseline}
                onChange={(e) => setBaseline(e.target.value)}
              >
                <option value="latest">Latest run</option>
                <option value="none">None (no comparison)</option>
              </Select>
            </div>
          </div>
        </Card>

        {error && (
          <div className="p-4 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-lg">
            <p className="text-[var(--error)]">{error.message}</p>
          </div>
        )}

        {loading ? (
          <Card className="animate-pulse">
            <div className="h-6 w-32 bg-[var(--stroke)] rounded mb-4" />
            <div className="h-20 w-full bg-[var(--stroke)] rounded" />
          </Card>
        ) : runs.length === 0 ? (
          <EmptyState
            icon={<IconChecklist size={48} />}
            title="No eval runs yet"
            description="Trigger your first run to populate the harness."
            action={<Button onClick={() => triggerRun({ suite: suiteId, baseline })}>Run suite</Button>}
          />
        ) : (
          <>
            <SummaryCard run={latestRun!} />
            <TaskBreakdown run={latestRun!} />

            {runs.length > 1 && (
              <Card>
                <p className="font-semibold text-[var(--ink)] mb-3">Run history</p>
                <div className="space-y-2">
                  {runs.slice(1).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs">{r.id.substring(0, 8)}…</span>
                      <span className="text-[var(--muted)]">
                        {r.summary ? formatPct(r.summary.passRate) : ", "} pass · {new Date(r.startedAt).toLocaleString()}
                      </span>
                      <Badge variant={r.status === "succeeded" ? "success" : "error"}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
