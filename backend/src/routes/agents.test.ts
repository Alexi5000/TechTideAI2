import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("agent routes", () => {
  it("GET /api/agents returns registry with ceo, orchestrators, workers", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/agents" });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.ceo).toBeDefined();
    expect(body.ceo.id).toBe("ceo");
    expect(body.ceo.tier).toBe("ceo");

    expect(Array.isArray(body.orchestrators)).toBe(true);
    expect(body.orchestrators.length).toBe(10);

    expect(Array.isArray(body.workers)).toBe(true);
    expect(body.workers.length).toBe(50);

    await app.close();
  });

  it("GET /api/agents/:id returns a valid agent", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/agents/ceo" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe("ceo");
    expect(body.name).toBe("Brian Cozy");
    expect(body.tier).toBe("ceo");
    expect(body.domain).toBeTruthy();
    expect(body.mission).toBeTruthy();
    expect(Array.isArray(body.responsibilities)).toBe(true);
    expect(Array.isArray(body.outputs)).toBe(true);
    expect(Array.isArray(body.tools)).toBe(true);
    expect(Array.isArray(body.metrics)).toBe(true);

    await app.close();
  });

  it("GET /api/agents/:id returns 404 for unknown agent", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/agents/nonexistent" });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});
