/**
 * Weaviate Knowledge Vector Repository
 *
 * Uses Weaviate REST/GraphQL APIs to store and query knowledge chunks.
 */

import { weaviateFetch } from "../services/weaviate.js";
import { VectorStoreUnavailableError } from "../domain/index.js";
import type {
  IKnowledgeVectorRepository,
  KnowledgeVectorChunkInput,
  KnowledgeVectorSearchInput,
  KnowledgeSearchResult,
} from "./types.js";

const CLASS_NAME = "KnowledgeChunkV2";
const LEGACY_CLASS_NAME = "KnowledgeChunk";

const schemaDefinition = {
  class: CLASS_NAME,
  vectorizer: "none",
  properties: [
    { name: "orgId", dataType: ["text"], tokenization: "field", indexFilterable: true },
    { name: "documentId", dataType: ["text"] },
    { name: "chunkIndex", dataType: ["int"] },
    { name: "title", dataType: ["text"] },
    { name: "source", dataType: ["text"] },
    { name: "collections", dataType: ["text[]"] },
    { name: "content", dataType: ["text"] },
  ],
};

function toCollectionsArray(collection: string | null) {
  if (!collection) return [];
  return [collection];
}

export function createKnowledgeVectorRepository(): IKnowledgeVectorRepository {
  async function assertExistingSchema(response: Response): Promise<void> {
    const schema = await response.json();
    const properties = Array.isArray(schema.properties) ? schema.properties : [];
    const orgProperties = properties.filter((p: { name?: string }) => p.name === "orgId");
    const orgProperty = orgProperties[0];
    if (orgProperties.length !== 1 || !Array.isArray(orgProperty.dataType) || orgProperty.dataType.length !== 1 || orgProperty.dataType[0] !== "text" || orgProperty.tokenization !== "field" || orgProperty.indexFilterable !== true) {
      throw new VectorStoreUnavailableError("Incompatible knowledge collection tenant schema");
    }
    const legacy = await weaviateFetch(`/v1/schema/${LEGACY_CLASS_NAME}`, { method: "GET" });
    if (legacy.ok) throw new VectorStoreUnavailableError("Legacy and V2 coexist; cutover is not approved");
    if (legacy.status !== 404) throw new VectorStoreUnavailableError("Unable to verify legacy cutover state");
  }

  async function ensureSchema(): Promise<void> {
    const response = await weaviateFetch(`/v1/schema/${CLASS_NAME}`, {
      method: "GET",
    });

    if (response.ok) {
      await assertExistingSchema(response);
      return;
    }

    if (response.status !== 404) {
      const body = await response.text();
      throw new VectorStoreUnavailableError(
        `Weaviate schema check failed: ${response.status} ${body}`,
      );
    }

    const legacyResponse = await weaviateFetch(`/v1/schema/${LEGACY_CLASS_NAME}`, { method: "GET" });
    if (legacyResponse.ok) {
      throw new VectorStoreUnavailableError("Legacy knowledge collection requires migration before use");
    }
    if (legacyResponse.status !== 404) {
      throw new VectorStoreUnavailableError("Unable to verify legacy knowledge collection");
    }

    const createResponse = await weaviateFetch("/v1/schema", {
      method: "POST",
      body: JSON.stringify(schemaDefinition),
    });

    if (!createResponse.ok) {
      const body = await createResponse.text();
      // A concurrent first request may have created the class; validate it rather than failing.
      const existing = await weaviateFetch(`/v1/schema/${CLASS_NAME}`, { method: "GET" });
      if (existing.ok) {
        await assertExistingSchema(existing);
        return;
      }
      throw new VectorStoreUnavailableError(
        `Failed to create Weaviate schema: ${createResponse.status} ${body}`,
      );
    }
  }

  async function upsertChunks(chunks: KnowledgeVectorChunkInput[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }
    if (chunks.some((chunk) => typeof chunk.orgId !== "string" || chunk.orgId.trim() === "")) {
      throw new VectorStoreUnavailableError("Knowledge tenant ID is required");
    }

    await ensureSchema();

    const response = await weaviateFetch("/v1/batch/objects", {
      method: "POST",
      body: JSON.stringify({
        objects: chunks.map((chunk) => ({
          class: CLASS_NAME,
          id: chunk.id,
          properties: {
            orgId: chunk.orgId,
            documentId: chunk.documentId,
            chunkIndex: chunk.chunkIndex,
            title: chunk.title,
            source: chunk.source,
            collections: toCollectionsArray(chunk.collection),
            content: chunk.content,
          },
          vector: chunk.vector,
        })),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new VectorStoreUnavailableError(
        `Weaviate batch insert failed: ${response.status} ${body}`,
      );
    }
    const results: unknown = await response.json();
    const expectedIds = new Set(chunks.map((chunk) => chunk.id));
    if (expectedIds.size !== chunks.length || !Array.isArray(results) || results.length !== expectedIds.size) {
      throw new VectorStoreUnavailableError("Weaviate batch result count mismatch");
    }
    for (const item of results) {
      if (typeof item?.id !== "string" || !expectedIds.delete(item.id) || item.result?.status !== "SUCCESS") {
        throw new VectorStoreUnavailableError("Weaviate batch contains missing or failed objects");
      }
    }
    if (expectedIds.size !== 0) {
      throw new VectorStoreUnavailableError("Weaviate batch omitted objects");
    }
  }

  async function search(
    input: KnowledgeVectorSearchInput,
  ): Promise<KnowledgeSearchResult[]> {
    if (typeof input.orgId !== "string" || input.orgId.trim() === "") {
      throw new VectorStoreUnavailableError("Knowledge tenant ID is required");
    }
    await ensureSchema();
    if (!input.vector.length || input.vector.some((value) => !Number.isFinite(value))) {
      throw new VectorStoreUnavailableError("Search vector must contain finite numbers");
    }
    if (!Number.isSafeInteger(input.limit) || input.limit < 1) {
      throw new VectorStoreUnavailableError("Search limit must be a positive safe integer");
    }
    const orgId = JSON.stringify(input.orgId);
    const includeCollections = Boolean(input.collections && input.collections.length > 0);
    const whereClause = includeCollections
      ? `where: { operator: And, operands: [
          { path: ["orgId"], operator: Equal, valueText: ${orgId} },
          { path: ["collections"], operator: ContainsAny, valueText: ${JSON.stringify(input.collections)} }
        ] }`
      : `where: { path: ["orgId"], operator: Equal, valueText: ${orgId} }`;

    const query = `
      query SearchKnowledge {
        Get {
          ${CLASS_NAME}(
            nearVector: { vector: ${JSON.stringify(input.vector)} }
            ${whereClause}
            limit: ${input.limit}
          ) {
            documentId
            orgId
            chunkIndex
            title
            source
            collections
            content
            _additional { id distance }
          }
        }
      }
    `;

    const response = await weaviateFetch("/v1/graphql", {
      method: "POST",
      body: JSON.stringify({
        query,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new VectorStoreUnavailableError(
        `Weaviate search failed: ${response.status} ${body}`,
      );
    }

    const payload = await response.json();
    if (payload.errors) {
      throw new VectorStoreUnavailableError(
        `Weaviate search error: ${JSON.stringify(payload.errors)}`,
      );
    }

    const results = payload.data?.Get?.[CLASS_NAME];
    if (!Array.isArray(results) || results.some((item: Record<string, unknown>) => item["orgId"] !== input.orgId)) {
      throw new VectorStoreUnavailableError("Invalid or cross-tenant knowledge search response");
    }
    return results.map((item: Record<string, unknown>) => {
      const collections = (item["collections"] as string[] | undefined) ?? [];
      const additional = item["_additional"] as { id?: string; distance?: number } | undefined;
      return {
        chunkId: additional?.id ?? "",
        documentId: item["documentId"] as string,
        title: item["title"] as string,
        source: item["source"] as string,
        collection: collections[0] ?? null,
        content: item["content"] as string,
        chunkIndex: item["chunkIndex"] as number,
        distance: additional?.distance ?? null,
      };
    });
  }

  return {
    ensureSchema,
    upsertChunks,
    search,
  };
}
