/**
 * Knowledge Base Tool
 *
 * Query internal knowledge and policy documents.
 * MVP implementation uses simple keyword matching.
 * Future: integrate with vector store for semantic search.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// MVP: Static knowledge entries for demonstration
const KNOWLEDGE_ENTRIES = [
  {
    id: "arch-control-plane",
    collection: "architecture",
    content:
      "The Control Plane consists of the CEO agent and orchestrators who plan, approve, and audit decisions with measurable outcomes.",
    keywords: ["control plane", "ceo", "orchestrator", "decisions", "audit"],
  },
  {
    id: "arch-execution-plane",
    collection: "architecture",
    content:
      "The Execution Plane contains worker agents and automation pipelines that execute tasks with Supabase-backed history.",
    keywords: ["execution plane", "worker", "automation", "supabase", "tasks"],
  },
  {
    id: "arch-evidence-plane",
    collection: "architecture",
    content:
      "The Evidence Plane ensures every decision is tied to sources, KPIs, and risk controls to keep humans in the loop.",
    keywords: ["evidence plane", "kpis", "risk", "sources", "human in the loop"],
  },
  {
    id: "policy-agent-delegation",
    collection: "policies",
    content:
      "Agents must delegate to specialized workers for domain-specific tasks. The CEO agent sets strategic direction but does not execute operational work directly.",
    keywords: ["delegation", "ceo", "worker", "strategy", "operational"],
  },
  {
    id: "policy-evidence-requirement",
    collection: "policies",
    content:
      "All significant decisions must be backed by evidence trails. Agents should cite sources and maintain audit logs for compliance.",
    keywords: ["evidence", "compliance", "audit", "citations", "decisions"],
  },
];

function searchKnowledge(
  query: string,
  collections: string[],
): { content: string; source: string }[] {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/);

  return KNOWLEDGE_ENTRIES.filter((entry) => {
    // Filter by collection if specified
    if (collections.length > 0 && !collections.includes(entry.collection)) {
      return false;
    }

    // Simple keyword matching
    return entry.keywords.some((keyword) =>
      queryTerms.some(
        (term) => keyword.includes(term) || term.includes(keyword),
      ),
    );
  }).map((entry) => ({
    content: entry.content,
    source: `docs/${entry.collection}/${entry.id}`,
  }));
}

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
      .array(z.enum(["architecture", "policies", "operations", "guides"]))
      .default(["architecture", "policies"])
      .describe("Collections to search within"),
  }),

  outputSchema: z.object({
    answer: z.string(),
    sources: z.array(z.string()),
    matchCount: z.number(),
  }),

  execute: async (params) => {
    const { query, collections } = params;

    const results = searchKnowledge(query, collections);

    if (results.length === 0) {
      return {
        answer: `No relevant knowledge found for query: "${query}"`,
        sources: [],
        matchCount: 0,
      };
    }

    // Combine results into a coherent answer
    const answer = results.map((r) => r.content).join("\n\n");
    const sources = results.map((r) => r.source);

    return {
      answer,
      sources,
      matchCount: results.length,
    };
  },
});
