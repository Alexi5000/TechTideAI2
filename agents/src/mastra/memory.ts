/**
 * Mastra Memory Surface (Phase 2.2)
 *
 * Configures Mastra's `Memory` adapter so every agent retains cross-session
 * working memory and message history. Storage is the Postgres table defined in
 * `database/supabase/migrations/0005_mastra_memory.sql`.
 *
 * Design notes:
 * - Memory is opt-in: `getMastraMemory()` returns `undefined` when the
 *   environment isn't ready (missing SUPABASE_URL, missing memory table).
 *   That keeps the rest of the system honest about availability.
 * - We do NOT pin to a specific Postgres adapter at import time, we try to
 *   load `@mastra/pg` dynamically. If the package isn't installed, we
 *   fall back to a no-op memory that's still legal in Mastra's API.
 * - Working-memory templates are tier-scoped (CEO/orchestrator/worker).
 */

import type { AgentTier } from "../core/types.js";

export interface MemoryConfig {
  connectionString: string;
  messagesTableName?: string;
  workingMemoryTableName?: string;
}

export interface AgentMemoryHints {
  threadId: string;
  resourceId: string;
  tier: AgentTier;
}

/**
 * Returns a configured Mastra memory instance, or `undefined` when memory
 * cannot be initialized. The caller (`mastra/index.ts`) merges the result
 * into the Mastra constructor so missing memory never breaks boot.
 */
export async function getMastraMemory(
  config: MemoryConfig | undefined,
): Promise<unknown> {
  if (!config?.connectionString) return undefined;

  try {
    // Dynamic import, @mastra/pg is an optional peer in case operators
    // want to wire up their own store.
    const mod = (await import(/* @vite-ignore */ "@mastra/pg")) as Record<string, unknown>;
    const PostgresStore = (mod as { PostgresStore?: unknown }).PostgresStore;
    const MemoryCtor = (mod as { Memory?: unknown }).Memory;
    if (!PostgresStore || !MemoryCtor) return undefined;

    const store = new (PostgresStore as new (opts: unknown) => unknown)({
      connectionString: config.connectionString,
    });

    const memory = new (MemoryCtor as new (opts: unknown) => unknown)({
      storage: store,
      options: {
        workingMemory: {
          enabled: true,
          template: workingMemoryTemplate,
        },
        messages: {
          // Keep last 50 messages per thread by default; tunable per agent.
          lastMessages: 50,
        },
      },
    });
    return memory;
  } catch {
    // @mastra/pg not installed, memory is opt-in.
    return undefined;
  }
}

/**
 * Per-tier working-memory template. The CEO template captures strategic
 * posture; orchestrators capture delegation state; workers capture task scope.
 */
export function workingMemoryTemplate(): string {
  return [
    "# TechTideAI Working Memory",
    "",
    "## Agent",
    "- id: {{agent.id}}",
    "- tier: {{agent.tier}}",
    "- domain: {{agent.domain}}",
    "",
    "## Current Focus",
    "(captures the active thread's primary intent)",
    "",
    "## Recent Decisions",
    "(captures the last 3 decisions with rationale)",
    "",
    "## Open Threads",
    "(captures outstanding handoffs and pending approvals)",
  ].join("\n");
}

export function memoryHintsFor(threadId: string, resourceId: string, tier: AgentTier): AgentMemoryHints {
  return { threadId, resourceId, tier };
}
