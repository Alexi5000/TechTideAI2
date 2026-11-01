import { describe, expect, it, vi } from "vitest";
vi.mock("../services/supabase.js", () => ({
  supabase: {auth: {getUser: vi.fn().mockResolvedValue({data:{user:{id:"verified-user"}},error:null})}},
}));
import { buildServer } from "../server.js";
import { loadSprint } from "../cli/sprint-loader.js";

describe("request validation errors", () => {
  it.each([
    ["GET", "/api/runs", undefined],
    ["GET", "/api/runs/not-a-uuid", undefined],
    ["POST", "/api/runs", { agentId: "ceo" }],
  ])("%s %s returns 400 with the failing fields", async (method, url, payload) => {
    const app = await buildServer();
    const response = await app.inject({
      method: method as "GET" | "POST",
      url,
      headers: { authorization: "Bearer test" },
      ...(payload ? { payload } : {}),
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe("Bad Request");
    expect(body.issues.length).toBeGreaterThan(0);
    await app.close();
  });
});

describe("disabled execution routes", () => {
  it.each([
    ["POST", "/api/llm", { prompt: "hi" }],
    ["GET", "/api/evals/runs?limit=abc", undefined],
  ])("%s %s fails closed before validation", async (method, url, payload) => {
    const app = await buildServer();
    const response = await app.inject({method:method as "GET" | "POST", url, ...(payload ? {payload} : {})});
    expect(response.statusCode).toBe(503);
    await app.close();
  });
});

describe("sprint loader", () => {
  it("finds the bundled contract regardless of process.cwd()", async () => {
    const contract = await loadSprint("well-scoped-sprint");
    expect(contract).toBeDefined();
  });
});
