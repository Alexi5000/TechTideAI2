import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";
import { loadSprint } from "../cli/sprint-loader.js";

describe("request validation errors", () => {
  it.each([
    ["GET", "/api/runs", undefined],
    ["GET", "/api/runs/not-a-uuid", undefined],
    ["POST", "/api/runs", { agentId: "ceo" }],
    ["POST", "/api/llm", { prompt: "hi" }],
    ["GET", "/api/evals/runs?limit=abc", undefined],
  ])("%s %s returns 400 with the failing fields", async (method, url, payload) => {
    const app = await buildServer();
    const response = await app.inject({
      method: method as "GET" | "POST",
      url,
      ...(payload ? { payload } : {}),
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe("Bad Request");
    expect(body.issues.length).toBeGreaterThan(0);
    await app.close();
  });
});

describe("sprint loader", () => {
  it("finds the bundled contract regardless of process.cwd()", async () => {
    const contract = await loadSprint("well-scoped-sprint");
    expect(contract).toBeDefined();
  });
});
