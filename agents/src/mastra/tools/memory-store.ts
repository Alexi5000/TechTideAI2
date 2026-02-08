/**
 * Memory Store Tool
 *
 * Allows agents to persist information to long-term memory.
 * Shares the InMemoryLongTermMemory singleton with memory-recall.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { longTermMemory } from "./memory-recall.js";

const inputSchema = z.object({
  content: z.string().describe("Content to store in long-term memory"),
  agentId: z.string().optional().describe("Agent ID to associate with this memory"),
  metadata: z.record(z.unknown()).optional().describe("Additional metadata for the memory entry"),
});

const outputSchema = z.object({
  status: z.enum(["stored", "not_configured"]),
  entryId: z.string().nullable(),
  content: z.string(),
});

export const memoryStoreTool = createTool({
  id: "memory-store",
  description: "Persist important information, insights, or context to long-term memory for future recall.",
  inputSchema,
  outputSchema,
  execute: async (params) => {
    try {
      const entryId = randomUUID();
      await longTermMemory.store([{
        id: entryId,
        agentId: params.agentId ?? "unknown",
        content: params.content,
        metadata: params.metadata ?? {},
        timestamp: new Date().toISOString(),
      }]);
      return {
        status: "stored" as const,
        entryId,
        content: params.content,
      };
    } catch (error) {
      console.error("memory-store failed:", error);
      return {
        status: "not_configured" as const,
        entryId: null,
        content: params.content,
      };
    }
  },
});
