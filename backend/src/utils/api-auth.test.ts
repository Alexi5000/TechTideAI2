import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerApiAuth } from "./api-auth.js";

async function makeApp(mode = "production", token: string | undefined = "x".repeat(32)) {
  const app = Fastify();
  let calls = 0;
  registerApiAuth(app, {
    NODE_ENV: mode,
    BACKEND_API_TOKEN: token,
    CORS_ORIGIN: "http://localhost:5180",
  });
  app.post("/api/llm", async () => {
    calls += 1;
    return { ok: true };
  });
  app.get("/health", async () => ({ ok: true }));
  return { app, calls: () => calls };
}

describe("HTTP operator boundary", () => {
  it.each(["", "Bearer wrong", "Basic " + "x".repeat(32)])(
    "rejects invalid credentials %s",
    async (authorization) => {
      const { app, calls } = await makeApp();
      const response = await app.inject({
        method: "POST",
        url: "/api/llm",
        headers: { authorization },
      });
      expect(response.statusCode).toBe(401);
      expect(calls()).toBe(0);
      await app.close();
    },
  );
  it("allows configured operator and public health", async () => {
    const { app, calls } = await makeApp();
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/llm",
          headers: { authorization: "Bearer " + "x".repeat(32) },
        })
      ).statusCode,
    ).toBe(200);
    expect(calls()).toBe(1);
    expect((await app.inject("/health")).statusCode).toBe(200);
    await app.close();
  });
  it("blocks unexpected origins even with gateway credentials", async () => {
    const { app, calls } = await makeApp();
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/llm",
          headers: {
            authorization: "Bearer " + "x".repeat(32),
            origin: "https://attacker.invalid",
          },
        })
      ).statusCode,
    ).toBe(403);
    expect(calls()).toBe(0);
    await app.close();
  });
  it.each(["", "short"])("fails closed in production with weak configuration %s", async (token) => {
    const { app, calls } = await makeApp("production", token);
    expect((await app.inject({ method: "POST", url: "/api/llm" })).statusCode).toBe(503);
    expect(calls()).toBe(0);
    await app.close();
  });
  it("allows local development but rejects remote peers and rebinding hosts", async () => {
    const { app, calls } = await makeApp("development", "");
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/llm",
          remoteAddress: "127.0.0.1",
          headers: { host: "localhost:4050", origin: "http://localhost:5180" },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/llm",
          remoteAddress: "10.0.0.2",
          headers: { host: "localhost:4050" },
        })
      ).statusCode,
    ).toBe(503);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/llm",
          remoteAddress: "127.0.0.1",
          headers: { host: "attacker.invalid:4050" },
        })
      ).statusCode,
    ).toBe(503);
    expect(calls()).toBe(1);
    await app.close();
  });
});
