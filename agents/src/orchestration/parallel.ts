/**
 * Parallel Orchestration Primitive (Pattern #2)
 *
 * Executes multiple agent branches concurrently with optional
 * concurrency limit and retry for failed branches.
 *
 * Uses the batching pattern from EvalRunner.runDataset() (evaluation/runner.ts).
 */

import type { IAgentRuntime } from "../runtime/types.js";
import type { ParallelBranch, ParallelOptions, ParallelResult, BranchResult } from "./types.js";

interface PendingBranch {
  branch: ParallelBranch;
  attempts: number;
}

export async function parallel(
  runtime: IAgentRuntime,
  branches: ParallelBranch[],
  options?: ParallelOptions,
): Promise<ParallelResult> {
  if (branches.length === 0) {
    return { success: true, branches: {}, succeeded: 0, failed: 0 };
  }

  const maxRetries = options?.retries ?? 0;
  const concurrency = options?.concurrency ?? branches.length;
  const results: Record<string, BranchResult> = {};

  let pending: PendingBranch[] = branches.map((b) => ({ branch: b, attempts: 0 }));

  while (pending.length > 0) {
    if (options?.signal?.aborted) {
      for (const p of pending) {
        results[p.branch.key] = {
          key: p.branch.key,
          agentId: p.branch.agentId,
          result: { success: false, output: {}, events: [], error: "Aborted" },
          durationMs: 0,
          attempts: p.attempts,
        };
      }
      break;
    }

    const batch = pending.slice(0, concurrency);
    pending = pending.slice(concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (p) => {
        const span = options?.tracer?.startSpan(`parallel.branch.${p.branch.key}`, {
          agentId: p.branch.agentId,
          attempt: p.attempts + 1,
        });

        const start = Date.now();

        try {
          const result = await runtime.execute({
            agentId: p.branch.agentId,
            input: p.branch.input,
            ...(options?.signal ? { signal: options.signal } : {}),
          });

          const durationMs = Date.now() - start;

          if (span) {
            options!.tracer!.endSpan(span, result.success ? "ok" : "error");
          }

          return {
            pending: p,
            branchResult: {
              key: p.branch.key,
              agentId: p.branch.agentId,
              result,
              durationMs,
              attempts: p.attempts + 1,
            } satisfies BranchResult,
          };
        } catch (error) {
          const durationMs = Date.now() - start;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";

          if (span) {
            options!.tracer!.endSpan(span, "error");
          }

          return {
            pending: p,
            branchResult: {
              key: p.branch.key,
              agentId: p.branch.agentId,
              result: { success: false, output: {}, events: [], error: errorMessage },
              durationMs,
              attempts: p.attempts + 1,
            } satisfies BranchResult,
          };
        }
      }),
    );

    const retryQueue: PendingBranch[] = [];

    for (const settled of batchResults) {
      if (settled.status === "rejected") {
        // Promise.allSettled should not reject, but handle defensively
        continue;
      }

      const { pending: p, branchResult } = settled.value;

      if (!branchResult.result.success && p.attempts < maxRetries) {
        retryQueue.push({ branch: p.branch, attempts: p.attempts + 1 });
      } else {
        results[branchResult.key] = branchResult;
      }
    }

    // Prepend retries so they run in the next batch
    pending = [...retryQueue, ...pending];
  }

  const succeeded = Object.values(results).filter((r) => r.result.success).length;
  const failed = Object.values(results).filter((r) => !r.result.success).length;

  return {
    success: failed === 0,
    branches: results,
    succeeded,
    failed,
  };
}
