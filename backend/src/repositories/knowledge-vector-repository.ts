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

const CLASS_NAME = "KnowledgeChunk";

const schemaDefinition = {
  class: CLASS_NAME,
  vectorizer: "none",
  properties: [
    { name: "orgId", dataType: ["text"] },
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

/**
 * Validate and sanitize a UUID string to prevent GraphQL injection.
 * UUIDs are strictly formatted, making them safe for interpolation.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUUID(value: string, fieldName: string): string {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`Invalid UUID format for ${fieldName}: ${value}`);
  }
  return value;
}

/**
 * Sanitize a collection name to prevent injection.
 * Only allows alphanumeric characters, hyphens, and underscores.
 */
const COLLECTION_REGEX = /^[a-zA-Z0-9_-]+$/;

function sanitizeCollections(collections: string[] | null | undefined): string[] {
  if (!collections || collections.length === 0) return [];
  return collections.filter((c) => COLLECTION_REGEX.test(c));
}

export function createKnowledgeVectorRepository(): IKnowledgeVectorRepository {
  async function ensureSchema(): Promise<void> {
    const response = await weaviateFetch(`/v1/schema/${CLASS_NAME}`, {
      method: "GET",
    });

    if (response.ok) {
      return;
    }

    if (response.status !== 404) {
      const body = await response.text();
      throw new VectorStoreUnavailableError(
        `Weaviate schema check failed: ${response.status} ${body}`,
      );
    }

    const createResponse = await weaviateFetch("/v1/schema", {
      method: "POST",
      body: JSON.stringify(schemaDefinition),
    });

    if (!createResponse.ok) {
      const body = await createResponse.text();
      throw new VectorStoreUnavailableError(
        `Failed to create Weaviate schema: ${createResponse.status} ${body}`,
      );
    }
  }

  async function upsertChunks(chunks: KnowledgeVectorChunkInput[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

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
  }

  async function search(
    input: KnowledgeVectorSearchInput,
  ): Promise<KnowledgeSearchResult[]> {
    // Validate inputs to prevent GraphQL injection
    const sanitizedOrgId = validateUUID(input.orgId, "orgId");
    const sanitizedCollections = sanitizeCollections(input.collections);
    const includeCollections = sanitizedCollections.length > 0;

    // Build where filter using inline values (Weaviate 1.35+ format)
    // orgId is now validated as strict UUID format, safe for interpolation
    const orgIdFilter = `{ path: ["orgId"], operator: Equal, valueText: "${sanitizedOrgId}" }`;
    const whereClause = includeCollections
      ? `where: { operator: And, operands: [
          ${orgIdFilter},
          { path: ["collections"], operator: ContainsAny, valueTextArray: ${JSON.stringify(sanitizedCollections)} }
        ] }`
      : `where: ${orgIdFilter}`;

    // Use inline vector value instead of GraphQL variables (Weaviate 1.35+ compatibility)
    const vectorStr = `[${input.vector.join(", ")}]`;

    const query = `
      query SearchKnowledge {
        Get {
          ${CLASS_NAME}(
            nearVector: { vector: ${vectorStr} }
            ${whereClause}
            limit: ${input.limit}
          ) {
            documentId
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
      body: JSON.stringify({ query }),
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

    const results = payload.data?.Get?.[CLASS_NAME] ?? [];
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
