/**
 * Sprints Page
 *
 * Operator surface for the three-agent harness. Shows recent sprint runs with
 * iteration-by-iteration scores, a "Run sprint" trigger, and a drill-in to the
 * per-iteration scoring breakdown.
 */

import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { useSprints } from "@/hooks/use-sprints.js";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { Select } from "@/components/ui/select.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { IconRefresh, IconBolt, IconChecklist } from "@/components/icons/index.js";
import type { SprintResult } from "@/lib/api-client.js";
import type { DashboardContextType } from "@/components/layout/index.js";

function statusVariant(
  status: SprintResult["status"],
): "success" | "error" | "warning" | "default" {
  if (status === "succeeded") return "success";
  if (status === "errored") return "error";
  if (status === "plateau") return "warning";
  return "default";
}

function SummaryCard({ run }: { run: SprintResult }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-mono text-sm text-[var(--muted-strong)]">{run.id.substring(0, 8)}…</p>
          <p className="text-xs text-[var(--muted)]">
            {run.contractId} @ {run.contractVersion} · {new Date(run.startedAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
      </div>
      <div className="grid grid-cols-4 gap-3 mt-4">
        <Metric label="Best score" value={run.bestScore.toFixed(3)} />
        <Metric label="Iterations" value={String(run.iterations.length)} />
        <Metric label="Tokens" value={String(run.totalTokens)} />
        <Metric label="Cost" value={`$${run.totalCostUsd.toFixed(3)}`} />
      </div>
      {run.failureReason ? (
        <p className="mt-3 text-sm text-[var(--muted)]">{run.failureReason}</p>
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

function IterationTable({ run }: { run: SprintResult }) {
  return (
    <Card>
      <p className="font-semibold text-[var(--ink)] mb-3">Iterations</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)] border-b border-[var(--stroke)]">
              <th className="py-2 pr-3">Iter</th>
              <th className="py-2 pr-3">Score</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Plateau</th>
              <th className="py-2 pr-3">Rolling Δ</th>
              <th className="py-2 pr-3">Top failure</th>
            </tr>
          </thead>
          <tbody>
            {run.iterations.map((it) => (
              <tr key={it.iteration} className="border-b border-[var(--stroke)]/50">
                <td className="py-2 pr-3 font-mono text-xs">{it.iteration}</td>
                <td className="py-2 pr-3">{it.taskResult.score.toFixed(3)}</td>
                <td className="py-2 pr-3">
                  <Badge variant={it.taskResult.passed ? "success" : "error"}>
                    {it.taskResult.passed ? "PASS" : "FAIL"}
                  </Badge>
                </td>
                <td className="py-2 pr-3">
                  {it.plateauDetected ? <Badge variant="warning">plateau</Badge> : "—"}
                </td>
                <td className="py-2 pr-3">{it.rollingDelta.toFixed(3)}</td>
                <td className="py-2 pr-3 text-[var(--muted)] truncate max-w-[420px]">
                  {it.taskResult.failureReason ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function SprintsPage() {
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const { runs, loading, running, error, refetch, triggerRun } = useSprints();
  const [contractId, setContractId] = useState<string>("well-scoped-sprint");

  const contractOptions = useMemo(
    () => [
      { value: "well-scoped-sprint", label: "well-scoped-sprint" },
    ],
    [],
  );

  const latestRun = runs[0];

  return (
    <PageTransition>
      <Topbar
        title="Three-Agent Sprints"
        onMobileMenuToggle={onMobileMenuToggle}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={refetch} aria-label="Refresh">
              <IconRefresh size={18} />
            </Button>
            <Button onClick={() => triggerRun({ contract: contractId })} disabled={running}>
              <IconBolt size={16} />
              {running ? "Running…" : "Run sprint"}
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-[var(--content-max-width)] mx-auto space-y-6">
        <p className="text-[var(--muted-strong)]">
          Adversarial feedback loop: Generator drafts, Evaluator grades on the four axes
          (correctness, safety, completeness, quality). Stops on pass, plateau, or
          max-iterations. See <code>docs/posts/three-agent-harness.md</code> and{" "}
          <code>evals/sprints/README.md</code>.
        </p>

        <Card>
          <label className="text-sm text-[var(--muted)]" htmlFor="contract-select">
            Sprint contract
          </label>
          <Select
            id="contract-select"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
          >
            {contractOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Card>

        {error ? (
          <div className="p-4 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-lg">
            <p className="text-[var(--error)]">{error.message}</p>
          </div>
        ) : null}

        {loading ? (
          <Card className="animate-pulse">
            <div className="h-6 w-32 bg-[var(--stroke)] rounded mb-4" />
            <div className="h-20 w-full bg-[var(--stroke)] rounded" />
          </Card>
        ) : runs.length === 0 ? (
          <EmptyState
            icon={<IconChecklist size={48} />}
            title="No sprint runs yet"
            description="Trigger your first sprint to populate the harness."
            action={<Button onClick={() => triggerRun({ contract: contractId })}>Run sprint</Button>}
          />
        ) : (
          <>
            {latestRun ? <SummaryCard run={latestRun} /> : null}
            {latestRun ? <IterationTable run={latestRun} /> : null}
            {runs.length > 1 ? (
              <Card>
                <p className="font-semibold text-[var(--ink)] mb-3">Run history</p>
                <div className="space-y-2">
                  {runs.slice(1).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs">{r.id.substring(0, 8)}…</span>
                      <span className="text-[var(--muted)]">
                        {r.bestScore.toFixed(2)} best · {new Date(r.startedAt).toLocaleString()}
                      </span>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </PageTransition>
  );
}
