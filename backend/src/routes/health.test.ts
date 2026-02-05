import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("health", () => {
  it("returns ok status", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");

    await app.close();
  });
});
