import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ agent: vi.fn(), approval: vi.fn() }));
vi.mock("./routes/agents.js", () => ({registerAgentRoutes:mocks.agent}));
vi.mock("./routes/approvals.js", () => ({registerApprovalRoutes:mocks.approval}));
vi.mock("./routes/health.js", () => ({registerHealthRoutes:vi.fn()}));
vi.mock("./routes/llm.js", () => ({registerLlmRoutes:vi.fn()}));
vi.mock("./routes/runs.js", () => ({registerRunRoutes:vi.fn()}));
vi.mock("./routes/knowledge.js", () => ({registerKnowledgeRoutes:vi.fn()}));
vi.mock("./routes/evals.js", () => ({registerEvalRoutes:vi.fn()}));
vi.mock("./routes/sprints.js", () => ({registerSprintRoutes:vi.fn()}));
import { buildServer } from "./server.js";

describe("approval repository wiring", () => {
  it("shares one repository between agent execution and approval routes", async () => {
    const app = await buildServer();
    expect(mocks.agent).toHaveBeenCalledOnce();
    expect(mocks.approval).toHaveBeenCalledOnce();
    expect(mocks.agent.mock.calls[0]?.[1]).toBe(mocks.approval.mock.calls[0]?.[1]);
    await app.close();
  });
});
