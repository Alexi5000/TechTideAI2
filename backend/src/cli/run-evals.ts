#!/usr/bin/env tsx
/**
 * Eval CLI — runs a suite, prints a summary table, exits non-zero on regression.
 *
 * Usage:
 *   pnpm -C backend evals [--suite golden-tasks.v1] [--baseline latest] [--json]
 *                       [--concurrency 4] [--fixtures-dir ../../evals/fixtures]
 *                       [--write-docs]
 *
 * Flags:
 *   --suite <id>         Suite to load. Defaults to "golden-tasks.v1".
 *   --baseline <id|latest|none>  Compare against the named eval run, or the latest
 *                               stored run for this suite, or skip the comparison.
 *   --json               Emit JSON to stdout instead of a table (CI-friendly).
 *   --concurrency <n>    Number of concurrent task runners (default 1 = deterministic).
 *   --fixtures-dir <p>   Override the fixtures directory.
 *   --write-docs         Also write docs/EVALS/<runId>.json for the dashboard.
 *   --judge-model <id>   Override the LLM-judge model (default gpt-4o).
 */

import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { createMastraRuntime } from "@techtide/agents";

import { EvalHarness } from "../services/eval-harness.js";
import { loadSuite, loadDefaultSuite } from "../services/eval-suite-loader.js";
import { createInMemoryEvalRunRepository } from "../repositories/eval-run-repository.js";
import type { EvalRun } from "../domain/entities/eval-run.js";

interface ParsedArgs {
  suite: string;
  baseline: string;
  json: boolean;
  concurrency: number;
  fixturesDir?: string | undefined;
  writeDocs: boolean;
  judgeModel?: string | undefined;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = {
    suite: "golden-tasks.v1",
    baseline: "latest",
    json: false,
    concurrency: 1,
    writeDocs: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--suite":
        out.suite = next ?? out.suite;
        i++;
        break;
      case "--baseline":
        out.baseline = next ?? out.baseline;
        i++;
        break;
      case "--json":
        out.json = true;
        break;
      case "--concurrency":
        out.concurrency = Number(next ?? "1");
        i++;
        break;
      case "--fixtures-dir":
        out.fixturesDir = next;
        i++;
        break;
      case "--write-docs":
        out.writeDocs = true;
        break;
      case "--judge-model":
        out.judgeModel = next;
        i++;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        process.stderr.write(`Unknown flag: ${arg}\n`);
        process.exit(2);
    }
  }
  return out;
}

function printHelp(): void {
  process.stdout.write(
    [
      "TechTideAI Eval CLI",
      "",
      "Usage:",
      "  pnpm -C backend evals [--suite <id>] [--baseline <id|latest|none>]",
      "                        [--json] [--concurrency <n>] [--write-docs]",
      "                        [--fixtures-dir <path>] [--judge-model <id>]",
      "",
      "Exits non-zero if the run regresses by more than EVAL_REGRESSION_THRESHOLD_PCT",
      "vs. the chosen baseline (default 5%).",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const fixturesDir = args.fixturesDir
    ? resolve(process.cwd(), args.fixturesDir)
    : undefined;

  const repo = createInMemoryEvalRunRepository();
  const suite =
    args.suite === "golden-tasks.v1"
      ? await loadDefaultSuite({ fixturesDir })
      : await loadSuite(args.suite, { fixturesDir });

  const baseline = await resolveBaseline(repo, suite.id, args.baseline);

  const harness = new EvalHarness({
    agentRuntime: createMastraRuntime(),
    concurrency: args.concurrency,
  });

  let run: EvalRun;
  try {
    run = await harness.runSuite({
      suite,
      baseline: baseline ?? undefined,
      judgeModel: args.judgeModel ?? "gpt-4o",
    });
  } catch (err) {
    process.stderr.write(`Eval run failed: ${(err as Error).message}\n`);
    if ((err as Error).name === "EvalRegressionDetectedError") {
      process.exit(3);
    }
    process.exit(2);
  }

  await repo.save(run);

  if (args.writeDocs) {
    await writeLatestJson(run);
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(run, null, 2) + "\n");
  } else {
    printTable(run);
  }

  if (run.summary?.regressionDeltaPct !== null && run.summary?.regressionDeltaPct !== undefined) {
    if (run.summary.regressionDeltaPct < -5) {
      process.stderr.write(
        `\nRegression: pass rate dropped ${(-run.summary.regressionDeltaPct).toFixed(1)}% vs baseline.\n`,
      );
      process.exit(3);
    }
  }
}

async function resolveBaseline(
  repo: ReturnType<typeof createInMemoryEvalRunRepository>,
  suiteId: string,
  baselineArg: string,
): Promise<EvalRun | null> {
  if (baselineArg === "none") return null;
  if (baselineArg === "latest") {
    return repo.findLatestBySuite(suiteId);
  }
  return repo.findById(baselineArg);
}

function printTable(run: EvalRun): void {
  const summary = run.summary;
  process.stdout.write("\n=== Eval Run ===\n");
  process.stdout.write(`Run id:           ${run.id}\n`);
  process.stdout.write(`Suite:            ${run.suiteId} @ ${run.suiteVersion}\n`);
  process.stdout.write(`Status:           ${run.status}\n`);
  if (summary) {
    process.stdout.write(`Pass rate:        ${(summary.passRate * 100).toFixed(1)}%\n`);
    process.stdout.write(`Mean score:       ${summary.meanScore.toFixed(3)}\n`);
    process.stdout.write(`p50 latency (ms): ${summary.p50LatencyMs}\n`);
    process.stdout.write(`p95 latency (ms): ${summary.p95LatencyMs}\n`);
    process.stdout.write(`Cost (USD est.):  $${summary.totalCostUsd.toFixed(3)}\n`);
    if (summary.regressionDeltaPct !== null) {
      const sign = summary.regressionDeltaPct >= 0 ? "+" : "";
      process.stdout.write(
        `Regression delta: ${sign}${summary.regressionDeltaPct.toFixed(1)}% vs baseline\n`,
      );
    }
  }
  process.stdout.write("\nTasks:\n");
  for (const result of run.taskResults) {
    const score = (result as { score: number }).score.toFixed(2);
    const passed = (result as { passed: boolean }).passed ? "PASS" : "FAIL";
    const reason = (result as { failureReason: string | null }).failureReason ?? "";
    process.stdout.write(`  [${passed}] ${(result as { taskId: string }).taskId.padEnd(34)} score=${score}  ${reason}\n`);
  }
  process.stdout.write("\n");
}

async function writeLatestJson(run: EvalRun): Promise<void> {
  const docsDir = resolve(process.cwd(), "../../docs/EVALS");
  await mkdir(docsDir, { recursive: true });
  const path = resolve(docsDir, `${run.id}.json`);
  await writeFile(path, JSON.stringify(run, null, 2));
  await writeFile(resolve(docsDir, "latest.json"), JSON.stringify(run, null, 2));
  process.stderr.write(`Wrote ${path}\n`);
}

main().catch((err) => {
  process.stderr.write(`${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
