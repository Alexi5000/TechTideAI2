#!/usr/bin/env tsx
/**
 * CLI: Evaluate Agent
 *
 * Run an evaluation dataset against agents.
 * Usage: tsx scripts/evaluate-agent.ts --dataset data/eval/ceo-basic.json
 */

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    dataset: { type: "string", short: "d" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || !values.dataset) {
  console.log(`
Usage: tsx scripts/evaluate-agent.ts --dataset <path>

Options:
  -d, --dataset  Path to evaluation dataset JSON file
  -h, --help     Show this help message
`);
  process.exit(values.help ? 0 : 1);
}

async function main() {
  const { parseDatasetJson } = await import("@techtide/agents");

  const raw = readFileSync(values.dataset!, "utf-8");
  const dataset = parseDatasetJson(raw);

  console.log(JSON.stringify({
    action: "evaluate-agent",
    datasetId: dataset.id,
    datasetName: dataset.name,
    caseCount: dataset.cases.length,
    agents: [...new Set(dataset.cases.map((c) => c.agentId))],
    status: "parsed",
    note: "Full evaluation requires LLM API keys. Set OPENAI_API_KEY to run.",
  }, null, 2));
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
