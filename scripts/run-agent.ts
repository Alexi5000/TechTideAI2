#!/usr/bin/env tsx
/**
 * CLI: Run Agent
 *
 * Execute an agent from the command line.
 * Usage: tsx scripts/run-agent.ts --agent ceo --prompt "What is our Q1 strategy?"
 */

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    agent: { type: "string", short: "a" },
    prompt: { type: "string", short: "p" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || !values.agent || !values.prompt) {
  console.log(`
Usage: tsx scripts/run-agent.ts --agent <id> --prompt <text>

Options:
  -a, --agent   Agent ID (e.g. "ceo", "orch-veronica")
  -p, --prompt  Prompt text to send to the agent
  -h, --help    Show this help message
`);
  process.exit(values.help ? 0 : 1);
}

async function main() {
  const { agentRegistry } = await import("@techtide/agents");

  const agent = agentRegistry.all.find((a) => a.id === values.agent);
  if (!agent) {
    console.error(`Agent not found: ${values.agent}`);
    console.error(`Available agents: ${agentRegistry.all.map((a) => a.id).join(", ")}`);
    process.exit(1);
  }

  console.log(JSON.stringify({
    action: "run-agent",
    agentId: agent.id,
    agentName: agent.name,
    tier: agent.tier,
    prompt: values.prompt,
    status: "submitted",
    note: "Agent execution requires LLM API keys. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.",
  }, null, 2));
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
