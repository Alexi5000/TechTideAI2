/**
 * Execution Map Tool
 *
 * Returns the current execution topology with run statistics.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { buildAuthHeaders, getApiBase } from "./http.js";

const API_BASE = getApiBase();

export const executionMapTool = createTool({
  id: "execution-map",
  description: "Return the execution topology and recent run statistics.",

  inputSchema: z.object({
    days: z.number().int().min(1).max(365).default(30),
  }),

  outputSchema: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        tier: z.string(),
        reportsTo: z.string().nullable(),
        runStats: z.object({
          runsTotal: z.number(),
          running: z.number(),
          queued: z.number(),
          succeeded: z.number(),
          failed: z.number(),
          canceled: z.number(),
          successRate: z.number(),
          lastRunAt: z.string().nullable(),
        }),
      }),
    ),
    edges: z.array(
      z.object({
        from: z.string(),
        to: z.string(),
      }),
    ),
  }),

  execute: async (params) => {
    const response = await fetch(
      `${API_BASE}/api/insights/execution-map?days=${params.days}`,
      {
        headers: buildAuthHeaders(),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Execution map unavailable (${response.status}): ${message}`);
    }

    return response.json();
  },
});
