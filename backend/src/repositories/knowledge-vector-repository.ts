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
    const includeCollections = Boolean(input.collections && input.collections.length > 0);
    const whereClause = includeCollections
      ? `where: { operator: And, operands: [
          { path: ["orgId"], operator: Equal, valueText: $orgId },
          { path: ["collections"], operator: ContainsAny, valueTextArray: $collections }
        ] }`
      : `where: { path: ["orgId"], operator: Equal, valueText: $orgId }`;

    const variableDefinitions = includeCollections
      ? "($vector: [Float!]!, $orgId: String!, $limit: Int!, $collections: [String!])"
      : "($vector: [Float!]!, $orgId: String!, $limit: Int!)";

    const query = `
      query SearchKnowledge${variableDefinitions} {
        Get {
          ${CLASS_NAME}(
            nearVector: { vector: $vector }
            ${whereClause}
            limit: $limit
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
      body: JSON.stringify({
        query,
        variables: {
          vector: input.vector,
          orgId: input.orgId,
          limit: input.limit,
          ...(includeCollections ? { collections: input.collections } : {}),
        },
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
