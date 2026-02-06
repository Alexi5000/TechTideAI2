/**
 * Knowledge Base Tool
 *
 * Query internal knowledge and policy documents via the backend knowledge API.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { buildAuthHeaders, getApiBase } from "./http.js";

const API_BASE = getApiBase();

export const knowledgeBaseTool = createTool({
  id: "knowledge-base",
  description:
    "Query internal knowledge and policy documents. Returns relevant information from architecture docs, policies, and operational guides.",

  inputSchema: z.object({
    query: z
      .string()
      .min(3)
      .describe("The search query to find relevant knowledge"),
    collections: z
      .array(
        z.enum(["architecture", "policies", "operations", "guides", "market-intel"]),
      )
      .default(["architecture", "policies"])
      .describe("Collections to search within"),
  }),

  outputSchema: z.object({
    answer: z.string(),
    sources: z.array(z.string()),
    matchCount: z.number(),
  }),

  execute: async (params) => {
    const { query, collections = ["architecture", "policies"] } = params;
    const response = await fetch(`${API_BASE}/api/knowledge/search`, {
      method: "POST",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        query,
        collections: collections.length > 0 ? collections : undefined,
        limit: 5,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      return {
        answer: `Knowledge base unavailable (${response.status}).`,
        sources: [message],
        matchCount: 0,
      };
    }

    const payload = (await response.json()) as {
      results: { content: string; source: string; documentId?: string }[];
    };

    if (!payload.results || payload.results.length === 0) {
      return {
        answer: `No relevant knowledge found for query: "${query}"`,
        sources: [],
        matchCount: 0,
      };
    }

    const answer = payload.results.map((r) => r.content).join("\n\n");
    const sources = payload.results.map(
      (r) => r.source ?? r.documentId ?? "unknown",
    );

    return {
      answer,
      sources,
      matchCount: payload.results.length,
    };
  },
});
