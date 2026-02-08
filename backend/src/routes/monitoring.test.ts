import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("monitoring routes", () => {
  it("GET /api/monitoring/metrics returns metrics array", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/monitoring/metrics" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.metrics)).toBe(true);
    expect(typeof body.count).toBe("number");
    expect(typeof body.timestamp).toBe("string");

    await app.close();
  });

  it("GET /api/monitoring/traces returns traces array", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/monitoring/traces" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.traces)).toBe(true);
    expect(typeof body.count).toBe("number");
    expect(typeof body.timestamp).toBe("string");

    await app.close();
  });

  it("GET /api/monitoring/traces respects limit parameter", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/api/monitoring/traces?limit=5" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.count).toBeLessThanOrEqual(5);

    await app.close();
  });
});
