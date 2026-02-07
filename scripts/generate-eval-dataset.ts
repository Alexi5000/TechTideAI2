#!/usr/bin/env tsx
/**
 * CLI: Generate Evaluation Dataset
 *
 * Generate evaluation datasets from agent definitions.
 * Usage: tsx scripts/generate-eval-dataset.ts --agent ceo --output data/eval/ceo-generated.json
 */

import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    agent: { type: "string", short: "a" },
    output: { type: "string", short: "o" },
    count: { type: "string", short: "n", default: "5" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || !values.agent) {
  console.log(`
Usage: tsx scripts/generate-eval-dataset.ts --agent <id> [--output <path>] [--count <n>]

Options:
  -a, --agent   Agent ID to generate dataset for
  -o, --output  Output file path (default: stdout)
  -n, --count   Number of cases to generate (default: 5)
  -h, --help    Show this help message
`);
  process.exit(values.help ? 0 : 1);
}

async function main() {
  const { agentRegistry, createDataset } = await import("@techtide/agents");

  const agent = agentRegistry.all.find((a) => a.id === values.agent);
  if (!agent) {
    console.error(`Agent not found: ${values.agent}`);
    process.exit(1);
  }

  const count = parseInt(values.count ?? "5", 10);

  // Generate basic evaluation cases from agent's responsibilities
  const cases = agent.responsibilities.slice(0, count).map((responsibility, i) => ({
    id: `${agent.id}-eval-${i + 1}`,
    agentId: agent.id,
    input: { prompt: `As ${agent.name}, address: ${responsibility}` },
    tags: [agent.tier, agent.domain],
  }));

  const dataset = createDataset(`${agent.name} Evaluation`, cases);

  const json = JSON.stringify(dataset, null, 2);

  if (values.output) {
    writeFileSync(values.output, json, "utf-8");
    console.error(`Written ${cases.length} cases to ${values.output}`);
  } else {
    console.log(json);
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
