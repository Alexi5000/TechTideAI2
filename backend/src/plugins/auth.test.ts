import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockEnv = {
  NODE_ENV: "test" as const,
  HOST: "0.0.0.0",
  PORT: 4050,
  CORS_ORIGIN: "http://localhost:5180",
  API_KEY: undefined as string | undefined,
  DEFAULT_ORG_ID: "00000000-0000-0000-0000-000000000001",
  DEFAULT_LLM_PROVIDER: "openai" as const,
  OPENAI_API_KEY: "sk-test-key-for-tests",
  ANTHROPIC_API_KEY: "sk-ant-test-key",
  SUPABASE_URL: undefined,
  SUPABASE_ANON_KEY: undefined,
  SUPABASE_SERVICE_ROLE_KEY: undefined,
  WEAVIATE_URL: undefined,
  WEAVIATE_API_KEY: undefined,
  OPENAI_EMBEDDING_MODEL: "text-embedding-3-small",
  KNOWLEDGE_CHUNK_WORDS: 200,
  KNOWLEDGE_CHUNK_OVERLAP_WORDS: 40,
  KNOWLEDGE_EMBED_BATCH_SIZE: 50,
};

vi.mock("../config/env.js", () => ({
  env: mockEnv,
}));

// Import after mock so buildServer picks up the mocked env
const { buildServer } = await import("../server.js");

import type { FastifyInstance } from "fastify";

describe("auth plugin", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    mockEnv.API_KEY = undefined;
    app = await buildServer();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("allows unauthenticated access when API_KEY is undefined", async () => {
    const res = await app.inject({ method: "GET", url: "/api/agents" });
    expect(res.statusCode).toBe(200);
  });

  it("health endpoint is exempt from auth", async () => {
    mockEnv.API_KEY = "test-key";
    await app.close();
    app = await buildServer();
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("root endpoint is exempt from auth", async () => {
    mockEnv.API_KEY = "test-key";
    await app.close();
    app = await buildServer();
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
  });

  it("rejects unauthenticated requests when API_KEY is set", async () => {
    mockEnv.API_KEY = "test-key";
    await app.close();
    app = await buildServer();
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/agents" });
    expect(res.statusCode).toBe(401);
  });

  it("accepts Bearer token", async () => {
    mockEnv.API_KEY = "test-key";
    await app.close();
    app = await buildServer();
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/api/agents",
      headers: { authorization: "Bearer test-key" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("accepts X-API-Key header", async () => {
    mockEnv.API_KEY = "test-key";
    await app.close();
    app = await buildServer();
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/api/agents",
      headers: { "x-api-key": "test-key" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("rejects wrong token", async () => {
    mockEnv.API_KEY = "test-key";
    await app.close();
    app = await buildServer();
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/api/agents",
      headers: { authorization: "Bearer wrong-key" },
    });
    expect(res.statusCode).toBe(401);
  });
});
