import { beforeEach, describe, expect, it, vi } from "vitest";

const { weaviateFetch } = vi.hoisted(() => ({ weaviateFetch: vi.fn() }));
vi.mock("../services/weaviate.js", () => ({ weaviateFetch }));
import { createKnowledgeVectorRepository } from "./knowledge-vector-repository.js";

const schema = { properties: [{ name: "orgId", dataType: ["text"], tokenization: "field", indexFilterable: true }] };
const chunk = { id: "id-1", orgId: "org-a", documentId: "doc", chunkIndex: 0, title: "title", source: "source", collection: null, content: "text", vector: [1] };

describe("knowledge vector batch result validation", () => {
  beforeEach(() => weaviateFetch.mockReset());

  it("fails when a successful HTTP batch contains an object error", async () => {
    weaviateFetch.mockResolvedValueOnce(Response.json(schema));
    weaviateFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    weaviateFetch.mockResolvedValueOnce(Response.json([{ id: "id-1", result: { status: "FAILED", errors: { error: [{ message: "rejected" }] } } }]));
    await expect(createKnowledgeVectorRepository().upsertChunks([chunk])).rejects.toThrow();
  });

  it("fails when a batch response omits the requested object", async () => {
    weaviateFetch.mockResolvedValueOnce(Response.json(schema));
    weaviateFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    weaviateFetch.mockResolvedValueOnce(Response.json([]));
    await expect(createKnowledgeVectorRepository().upsertChunks([chunk])).rejects.toThrow();
  });
});

describe("migration readiness", () => {
  it("rejects coexistence of legacy and V2 collections without an approved cutover", async () => {
    weaviateFetch.mockReset();
    weaviateFetch.mockResolvedValueOnce(Response.json(schema));
    weaviateFetch.mockResolvedValueOnce(Response.json({ class: "KnowledgeChunk" }));
    await expect(createKnowledgeVectorRepository().ensureSchema()).rejects.toThrow(/cutover/i);
  });
});
