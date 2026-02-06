/**
 * Org KPI Dashboard Tool
 *
 * Fetches organization KPI rollups for the requested time window.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { buildAuthHeaders, getApiBase } from "./http.js";

const API_BASE = getApiBase();

export const orgKpiDashboardTool = createTool({
  id: "org-kpi-dashboard",
  description: "Return organization KPI rollups for runs and execution health.",

  inputSchema: z.object({
    days: z.number().int().min(1).max(365).default(30),
  }),

  outputSchema: z.object({
    orgId: z.string(),
    range: z.object({
      from: z.string(),
      to: z.string(),
    }),
    totals: z.object({
      runsTotal: z.number(),
      running: z.number(),
      queued: z.number(),
      succeeded: z.number(),
      failed: z.number(),
      canceled: z.number(),
    }),
    successRate: z.number(),
    avgDurationMs: z.number().nullable(),
    lastRunAt: z.string().nullable(),
    topAgents: z.array(
      z.object({
        agentId: z.string(),
        runCount: z.number(),
        successRate: z.number(),
      }),
    ),
  }),

  execute: async (params) => {
    const response = await fetch(`${API_BASE}/api/insights/kpis?days=${params.days}`,
      {
        headers: buildAuthHeaders(),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`KPI dashboard unavailable (${response.status}): ${message}`);
    }

    return response.json();
  },
});
