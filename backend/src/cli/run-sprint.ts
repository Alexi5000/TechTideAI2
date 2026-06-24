#!/usr/bin/env tsx
/**
 * Sprint CLI - runs a three-agent adversarial feedback loop.
 *
 * Usage:
 *   pnpm -C backend sprint --contract evals/sprints/well-scoped-sprint.v1.json
 *   pnpm -C backend sprint --contract well-scoped-sprint
 *   pnpm -C backend sprint --contract well-scoped-sprint --json
 *   pnpm -C backend sprint --contract well-scoped-sprint --concurrency 1
 */

import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { createMastraRuntime } from "@techtide/agents";

import { ThreeAgentHarness } from "../services/three-agent-harness.js";
import { loadSprint } from "./sprint-loader.js";
import { createInMemorySprintRepository } from "../repositories/sprint-repository.js";
import type { SprintResult } from "../domain/entities/sprint-result.js";

interface ParsedArgs {
  contract: string;
  json: boolean;
  concurrency: number;
  writeDocs: boolean;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = { contract: "well-scoped-sprint", json: false, concurrency: 1, writeDocs: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--contract":
        out.contract = next ?? out.contract;
        i++;
        break;
      case "--json":
        out.json = true;
        break;
      case "--concurrency":
        out.concurrency = Number(next ?? "1");
        i++;
        break;
      case "--write-docs":
        out.writeDocs = true;
        break;
      case "-h":
      case "--help":
        process.stdout.write(
          [
            "TechTideAI Sprint CLI",
            "",
            "Usage:",
            "  pnpm -C backend sprint [--contract <id>] [--json] [--concurrency <n>] [--write-docs]",
            "",
            "Examples:",
            "  pnpm -C backend sprint --contract evals/sprints/well-scoped-sprint.v1.json",
            "  pnpm -C backend sprint --contract well-scoped-sprint",
          ].join("\n"),
        );
        process.exit(0);
        break;
      default:
        process.stderr.write(`Unknown flag: ${arg}\n`);
        process.exit(2);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const contract = await loadSprint(args.contract);
  const repo = createInMemorySprintRepository();
  const harness = new ThreeAgentHarness({
    agentRuntime: createMastraRuntime(),
    concurrency: args.concurrency,
  });

  let run: SprintResult;
  try {
    run = await harness.runSprint({ contract });
  } catch (err) {
    process.stderr.write(`Sprint failed: ${(err as Error).message}\n`);
    process.exit(1);
  }
  await repo.save(run);

  if (args.writeDocs) {
    const dir = resolve(process.cwd(), "../../docs/EVALS/sprints");
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, `${run.id}.json`), JSON.stringify(run, null, 2));
    await writeFile(resolve(dir, "latest.json"), JSON.stringify(run, null, 2));
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(run, null, 2) + "\n");
  } else {
    printTable(run);
  }

  process.exit(run.status === "succeeded" ? 0 : 1);
}

function printTable(run: SprintResult): void {
  process.stdout.write("\n=== Sprint Run ===\n");
  process.stdout.write(`Run id:       ${run.id}\n`);
  process.stdout.write(`Contract:     ${run.contractId} @ ${run.contractVersion}\n`);
  process.stdout.write(`Status:       ${run.status}\n`);
  process.stdout.write(`Iterations:   ${run.iterations.length}\n`);
  process.stdout.write(`Best score:   ${run.bestScore.toFixed(3)} (iter ${run.bestIteration ?? ", "})\n`);
  process.stdout.write(`Total tokens: ${run.totalTokens}\n`);
  process.stdout.write(`Cost (USD):   $${run.totalCostUsd.toFixed(3)}\n`);
  if (run.failureReason) process.stdout.write(`Reason:       ${run.failureReason}\n`);
  process.stdout.write("\nIterations:\n");
  for (const iter of run.iterations) {
    const status = iter.taskResult.passed ? "PASS" : "FAIL";
    const plateau = iter.plateauDetected ? " (plateau)" : "";
    process.stdout.write(
      `  [${status}] iter=${iter.iteration} score=${iter.taskResult.score.toFixed(3)}${plateau}\n`,
    );
  }
  process.stdout.write("\n");
}

main().catch((err) => {
  process.stderr.write(`${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
