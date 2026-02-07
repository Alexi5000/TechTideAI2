/**
 * Stub Tool Implementations
 *
 * These tools are referenced by agents but not yet fully implemented.
 * They return helpful "not implemented" responses instead of crashing.
 *
 * Each stub follows the same pattern:
 * 1. Accept a query or action input
 * 2. Return a structured response indicating the feature is planned
 * 3. Preserve the query for debugging/logging purposes
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const stubInputSchema = z.object({
  query: z.string().optional().describe("Query or action to perform"),
  params: z.record(z.unknown()).optional().describe("Additional parameters"),
});

const stubOutputSchema = z.object({
  status: z.literal("not_implemented"),
  tool: z.string(),
  message: z.string(),
  query: z.string().nullable(),
});

type StubOutput = z.infer<typeof stubOutputSchema>;

function createStubTool(id: string, description: string) {
  return createTool({
    id,
    description,
    inputSchema: stubInputSchema,
    outputSchema: stubOutputSchema,
    execute: async (params): Promise<StubOutput> => ({
      status: "not_implemented" as const,
      tool: id,
      message: `Tool '${id}' is planned for a future release. ${description}`,
      query: params.query ?? null,
    }),
  });
}

// HR & Talent Tools
export const talentHubTool = createStubTool(
  "talent-hub",
  "Access HR data, talent pipelines, and workforce analytics."
);

// Finance Tools
export const financeLedgerTool = createStubTool(
  "finance-ledger",
  "Query financial records, budgets, and accounting data."
);

// Sales & CRM Tools
export const crmInsightsTool = createStubTool(
  "crm-insights",
  "Access CRM data, customer insights, and sales analytics."
);

// Content & Marketing Tools
export const contentLabTool = createStubTool(
  "content-lab",
  "Generate, manage, and publish content assets."
);

// Support Tools
export const supportHubTool = createStubTool(
  "support-hub",
  "Access support ticket system, customer queries, and resolution tracking."
);

// Analytics & Data Tools
export const userInsightsTool = createStubTool(
  "user-insights",
  "Analyze user behavior, engagement patterns, and product usage."
);

export const dataLakeTool = createStubTool(
  "data-lake",
  "Query raw data from the data warehouse for analysis."
);

// Operations Tools
export const runbookTool = createStubTool(
  "runbook",
  "Execute operational runbooks and standard operating procedures."
);
