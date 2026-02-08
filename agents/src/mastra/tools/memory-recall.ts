/**
 * Memory Recall Tool
 *
 * Allows agents to query long-term memory via substring matching.
 * Uses a shared InMemoryLongTermMemory singleton for MVP.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { InMemoryLongTermMemory } from "../../memory/long-term.js";

// Shared singleton — replace with DI or vector-backed store post-MVP
export const longTermMemory = new InMemoryLongTermMemory();

const inputSchema = z.object({
  query: z.string().describe("Search query for memory recall"),
  agentId: z.string().optional().describe("Filter by specific agent ID"),
  limit: z.number().int().min(1).max(50).optional().describe("Maximum results to return"),
});

const outputSchema = z.object({
  status: z.enum(["success", "not_configured"]),
  results: z.array(z.object({
    id: z.string(),
    content: z.string(),
    agentId: z.string(),
    timestamp: z.string(),
  })),
  query: z.string(),
});

export const memoryRecallTool = createTool({
  id: "memory-recall",
  description: "Search long-term memory for relevant past interactions, knowledge, and context.",
  inputSchema,
  outputSchema,
  execute: async (params) => {
    try {
      const results = await longTermMemory.search(
        params.query,
        params.agentId,
        params.limit ?? 10,
      );
      return {
        status: "success" as const,
        results: results.map((r) => ({
          id: r.id,
          content: r.content,
          agentId: r.agentId,
          timestamp: r.timestamp,
        })),
        query: params.query,
      };
    } catch (error) {
      console.error("memory-recall failed:", error);
      return {
        status: "not_configured" as const,
        results: [],
        query: params.query,
      };
    }
  },
});
