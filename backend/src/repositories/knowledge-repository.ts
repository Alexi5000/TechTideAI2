/**
 * Supabase Knowledge Repository Implementation
 *
 * Infrastructure layer: implements IKnowledgeRepository using Supabase client.
 * Handles snake_case (DB) to camelCase (TS) mapping.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PersistenceUnavailableError } from "../domain/index.js";
import type {
  IKnowledgeRepository,
  KnowledgeDocument,
  KnowledgeChunk,
  CreateKnowledgeDocumentInput,
  CreateKnowledgeChunkInput,
  DbKnowledgeDocument,
  DbKnowledgeChunk,
} from "./types.js";

function mapDbDocumentToDocument(db: DbKnowledgeDocument): KnowledgeDocument {
  return {
    id: db.id,
    orgId: db.org_id,
    title: db.title,
    source: db.source,
    collection: db.collection,
    content: db.content,
    metadata: db.metadata,
    indexedAt: db.indexed_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapDbChunkToChunk(db: DbKnowledgeChunk): KnowledgeChunk {
  return {
    id: db.id,
    orgId: db.org_id,
    documentId: db.document_id,
    chunkIndex: db.chunk_index,
    content: db.content,
    tokenCount: db.token_count,
    createdAt: db.created_at,
  };
}

export function createKnowledgeRepository(
  supabase: SupabaseClient | null,
): IKnowledgeRepository {
  function requireSupabase(): SupabaseClient {
    if (!supabase) {
      throw new PersistenceUnavailableError(
        "Supabase client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    return supabase;
  }

  return {
    async createDocument(input: CreateKnowledgeDocumentInput): Promise<KnowledgeDocument> {
      const client = requireSupabase();

      const { data, error } = await client
        .from("knowledge_documents")
        .insert({
          org_id: input.orgId,
          title: input.title,
          source: input.source,
          collection: input.collection ?? null,
          content: input.content,
          metadata: input.metadata ?? {},
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create knowledge document: ${error.message}`);
      }

      return mapDbDocumentToDocument(data as DbKnowledgeDocument);
    },

    async getDocument(id: string): Promise<KnowledgeDocument | null> {
      const client = requireSupabase();

      const { data, error } = await client
        .from("knowledge_documents")
        .select()
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw new Error(`Failed to get knowledge document: ${error.message}`);
      }

      return mapDbDocumentToDocument(data as DbKnowledgeDocument);
    },

    async addChunks(
      documentId: string,
      orgId: string,
      chunks: CreateKnowledgeChunkInput[],
    ): Promise<KnowledgeChunk[]> {
      if (chunks.length === 0) {
        return [];
      }

      const client = requireSupabase();
      const payload = chunks.map((chunk) => ({
        org_id: orgId,
        document_id: documentId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        token_count: chunk.tokenCount ?? null,
      }));

      const { data, error } = await client
        .from("knowledge_chunks")
        .insert(payload)
        .select();

      if (error) {
        throw new Error(`Failed to create knowledge chunks: ${error.message}`);
      }

      return (data as DbKnowledgeChunk[]).map(mapDbChunkToChunk);
    },

    async listChunksByDocument(documentId: string): Promise<KnowledgeChunk[]> {
      const client = requireSupabase();

      const { data, error } = await client
        .from("knowledge_chunks")
        .select()
        .eq("document_id", documentId)
        .order("chunk_index", { ascending: true });

      if (error) {
        throw new Error(`Failed to list knowledge chunks: ${error.message}`);
      }

      return (data as DbKnowledgeChunk[]).map(mapDbChunkToChunk);
    },

    async markIndexed(documentId: string, indexedAt: string): Promise<void> {
      const client = requireSupabase();

      const { error } = await client
        .from("knowledge_documents")
        .update({ indexed_at: indexedAt })
        .eq("id", documentId);

      if (error) {
        throw new Error(`Failed to update knowledge index timestamp: ${error.message}`);
      }
    },
  };
}
