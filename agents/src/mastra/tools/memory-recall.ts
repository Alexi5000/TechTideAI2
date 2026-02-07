/**
 * Memory Recall Tool
 *
 * Allows agents to query long-term memory via vector similarity search.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

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
    // Memory integration point — when a long-term memory instance is wired in,
    // this tool will delegate to it. For now, returns empty results.
    return {
      status: "not_configured" as const,
      results: [],
      query: params.query,
    };
  },
});
