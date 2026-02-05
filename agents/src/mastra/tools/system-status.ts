import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const systemStatusTool = createTool({
  id: "system-status",
  description: "Report runtime health and uptime for orchestration diagnostics.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    status: z.string(),
    uptimeSeconds: z.number(),
    timestamp: z.string(),
  }),
  execute: async () => ({
    status: "ok",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  }),
});
