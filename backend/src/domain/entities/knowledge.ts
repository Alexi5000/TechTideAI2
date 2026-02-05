/**
 * Knowledge Entities - Domain Core
 *
 * Canonical definitions for knowledge documents and chunks used in vector search.
 */

export interface KnowledgeDocument {
  readonly id: string;
  readonly orgId: string;
  readonly title: string;
  readonly source: string;
  readonly collection: string | null;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly indexedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface KnowledgeChunk {
  readonly id: string;
  readonly orgId: string;
  readonly documentId: string;
  readonly chunkIndex: number;
  readonly content: string;
  readonly tokenCount: number | null;
  readonly createdAt: string;
}

export interface CreateKnowledgeDocumentInput {
  readonly orgId: string;
  readonly title: string;
  readonly source: string;
  readonly collection?: string | null | undefined;
  readonly content: string;
  readonly metadata?: Record<string, unknown> | undefined;
}

export interface KnowledgeSearchResult {
  readonly chunkId: string;
  readonly documentId: string;
  readonly title: string;
  readonly source: string;
  readonly collection: string | null;
  readonly content: string;
  readonly chunkIndex: number;
  readonly distance: number | null;
}
