/**
 * Memory Store Tool
 *
 * Allows agents to persist information to long-term memory.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

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
    // Memory integration point — when a long-term memory instance is wired in,
    // this tool will delegate to it. For now, returns not_configured.
    return {
      status: "not_configured" as const,
      entryId: null,
      content: params.content,
    };
  },
});
