import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("unfinished execution surfaces", () => {
  it.each([
    {method:"POST" as const,url:"/api/agents/test/run",payload:{orgId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}},
    {method:"POST" as const,url:"/api/llm",payload:{}},
    {method:"GET" as const,url:"/api/evals/runs"},
    {method:"POST" as const,url:"/api/evals/run"},
    {method:"GET" as const,url:"/api/sprints/runs"},
    {method:"POST" as const,url:"/api/sprints/run"},
  ])("fails closed for $method $url", async (request) => {
    const app=await buildServer();
    const result=await app.inject(request);
    expect(result.statusCode).toBe(503);
    await app.close();
  });
});
