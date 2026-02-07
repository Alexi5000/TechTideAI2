import { describe, expect, it } from "vitest";
import {
  talentHubTool,
  financeLedgerTool,
  crmInsightsTool,
  contentLabTool,
  supportHubTool,
  userInsightsTool,
  dataLakeTool,
  runbookTool,
} from "./stubs.js";

const STUB_TOOLS = [
  { tool: talentHubTool, id: "talent-hub" },
  { tool: financeLedgerTool, id: "finance-ledger" },
  { tool: crmInsightsTool, id: "crm-insights" },
  { tool: contentLabTool, id: "content-lab" },
  { tool: supportHubTool, id: "support-hub" },
  { tool: userInsightsTool, id: "user-insights" },
  { tool: dataLakeTool, id: "data-lake" },
  { tool: runbookTool, id: "runbook" },
] as const;

describe("stub tools", () => {
  it("covers exactly 8 stubs", () => {
    expect(STUB_TOOLS).toHaveLength(8);
  });

  it.each(STUB_TOOLS)(
    "$id returns not_implemented with query echoed back",
    async ({ tool, id }: (typeof STUB_TOOLS)[number]) => {
      const result = await tool.execute!(
        { query: "test query" },
        { connectionId: "test" } as never,
      );
      expect(result).toMatchObject({
        status: "not_implemented",
        tool: id,
        query: "test query",
      });
      expect((result as Record<string, unknown>)["message"]).toContain(id);
    },
  );

  it.each(STUB_TOOLS)(
    "$id returns null query when none provided",
    async ({ tool }: (typeof STUB_TOOLS)[number]) => {
      const result = await tool.execute!(
        {},
        { connectionId: "test" } as never,
      );
      expect((result as Record<string, unknown>)["query"]).toBeNull();
    },
  );
});
