#!/usr/bin/env tsx
/**
 * CLI: Delete Long-Term Memory
 *
 * Delete memory entries by IDs or by agent.
 * Usage: tsx scripts/delete-memory.ts --ids id1,id2,id3
 *        tsx scripts/delete-memory.ts --agent ceo
 */

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    ids: { type: "string" },
    agent: { type: "string", short: "a" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || (!values.ids && !values.agent)) {
  console.log(`
Usage: tsx scripts/delete-memory.ts --ids <id1,id2,...> | --agent <id>

Options:
  --ids        Comma-separated memory entry IDs to delete
  -a, --agent  Delete all memory entries for this agent
  -h, --help   Show this help message
`);
  process.exit(values.help ? 0 : 1);
}

async function main() {
  const ids = values.ids?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];

  console.log(JSON.stringify({
    action: "delete-memory",
    ids: ids.length > 0 ? ids : undefined,
    agentId: values.agent,
    status: "parsed",
    note: "Memory deletion requires WEAVIATE_URL to be configured.",
  }, null, 2));
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
