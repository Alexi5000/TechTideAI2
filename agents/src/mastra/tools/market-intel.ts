/**
 * Market Intel Tool
 *
 * Summarizes knowledge-base evidence into a market intelligence brief.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { buildAuthHeaders, getApiBase } from "./http.js";

const API_BASE = getApiBase();

export const marketIntelTool = createTool({
  id: "market-intel",
  description: "Summarize competitive and market research with evidence citations.",

  inputSchema: z.object({
    query: z.string().min(3),
    provider: z.enum(["openai", "anthropic"]).optional(),
    model: z.string().optional(),
    collections: z.array(z.string()).optional(),
  }),

  outputSchema: z.object({
    summary: z.string(),
    sources: z.array(
      z.object({
        title: z.string(),
        source: z.string(),
        documentId: z.string(),
        chunkId: z.string(),
      }),
    ),
    matches: z.array(
      z.object({
        content: z.string(),
        documentId: z.string(),
        chunkId: z.string(),
      }),
    ),
    provider: z.string(),
    model: z.string(),
  }),

  execute: async (params) => {
    const response = await fetch(`${API_BASE}/api/insights/market-intel`, {
      method: "POST",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        query: params.query,
        provider: params.provider,
        model: params.model,
        collections: params.collections,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Market intel unavailable (${response.status}): ${message}`);
    }

    return response.json();
  },
});
