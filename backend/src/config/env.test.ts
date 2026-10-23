import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("backend network defaults", () => {
  it("binds the default listener only to loopback and serves local requests", async () => {
    vi.stubEnv("HOST", undefined);
    vi.resetModules();
    const { env } = await import("./env.js");
    const app = Fastify();
    app.get("/probe", async () => ({ ok: true }));
    try {
      const url = await app.listen({ host: env.HOST, port: 0 });
      const address = app.server.address();
      expect(address && typeof address !== "string" && address.address).toBe("127.0.0.1");
      expect(await (await fetch(url + "/probe")).json()).toEqual({ ok: true });
    } finally {
      await app.close();
    }
  });

  it("retains an explicitly configured container or gateway listener", async () => {
    vi.stubEnv("HOST", "0.0.0.0");
    vi.resetModules();
    const { env } = await import("./env.js");
    expect(env.HOST).toBe("0.0.0.0");
  });
});
