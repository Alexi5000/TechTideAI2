import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("pipeline routes", () => {
  it("GET /api/pipelines returns available pipelines", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/pipelines" });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.pipelines).toBeDefined();
    expect(Array.isArray(body.pipelines)).toBe(true);
    expect(body.pipelines.length).toBeGreaterThanOrEqual(4);

    // Verify the 4 seeded pipelines exist
    const ids = body.pipelines.map((p: { id: string }) => p.id);
    expect(ids).toContain("ceo-strategic-review");
    expect(ids).toContain("parallel-research");
    expect(ids).toContain("domain-routing");
    expect(ids).toContain("content-optimization");

    await app.close();
  });

  it("POST /api/pipelines/:id/run returns 404 for unknown pipeline", async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/pipelines/nonexistent/run",
      payload: { input: { prompt: "test" } },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe("Pipeline not found");

    await app.close();
  });

  it("each seeded pipeline has correct pattern", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/pipelines" });
    const body = response.json();

    const pipelineMap = Object.fromEntries(
      body.pipelines.map((p: { id: string; pattern: string }) => [p.id, p.pattern]),
    );

    expect(pipelineMap["ceo-strategic-review"]).toBe("chain");
    expect(pipelineMap["parallel-research"]).toBe("parallel");
    expect(pipelineMap["domain-routing"]).toBe("route");
    expect(pipelineMap["content-optimization"]).toBe("eval-loop");

    await app.close();
  });
});
