import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("insights routes", () => {
  it("GET /api/insights/kpis returns data or 503", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/insights/kpis" });

    // 200 if Supabase configured, 503 if not
    expect([200, 503]).toContain(response.statusCode);

    await app.close();
  });

  it("GET /api/insights/kpis rejects days=0", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/insights/kpis?days=0" });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe("Bad Request");

    await app.close();
  });

  it("GET /api/insights/execution-map returns data or 503", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/insights/execution-map" });

    expect([200, 503]).toContain(response.statusCode);

    await app.close();
  });

  it("POST /api/insights/market-intel rejects short query", async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/insights/market-intel",
      payload: { query: "ab" },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it("POST /api/insights/market-intel rejects unknown model", async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/insights/market-intel",
      payload: { query: "test query for validation", model: "nonexistent-model" },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
