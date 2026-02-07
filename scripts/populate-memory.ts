#!/usr/bin/env tsx
/**
 * CLI: Populate Long-Term Memory
 *
 * Bulk load memory entries from a JSON file.
 * Usage: tsx scripts/populate-memory.ts --file data/memory-entries.json --agent ceo
 */

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    file: { type: "string", short: "f" },
    agent: { type: "string", short: "a" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || !values.file) {
  console.log(`
Usage: tsx scripts/populate-memory.ts --file <path> [--agent <id>]

Options:
  -f, --file   Path to JSON file with memory entries
  -a, --agent  Agent ID to associate entries with (optional)
  -h, --help   Show this help message

File format: Array of { content: string, metadata?: object }
`);
  process.exit(values.help ? 0 : 1);
}

async function main() {
  const raw = readFileSync(values.file!, "utf-8");
  const entries: Array<{ content: string; metadata?: Record<string, unknown> }> = JSON.parse(raw);

  if (!Array.isArray(entries)) {
    console.error("File must contain a JSON array of entries");
    process.exit(1);
  }

  console.log(JSON.stringify({
    action: "populate-memory",
    entryCount: entries.length,
    agentId: values.agent ?? "all",
    status: "parsed",
    note: "Memory population requires WEAVIATE_URL to be configured.",
  }, null, 2));
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
