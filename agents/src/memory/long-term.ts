/**
 * Long-Term Memory Implementation
 *
 * Persistent memory backed by a vector store (Weaviate).
 * Uses embedding-based similarity search for recall.
 *
 * This implementation depends on a VectorStore adapter that handles
 * the actual storage and retrieval. For testing, use the InMemoryLongTermMemory.
 */

import type { ILongTermMemory, MemoryEntry } from "./types.js";

/**
 * Vector store adapter interface — allows swapping backends.
 */
export interface VectorStoreAdapter {
  upsert(entries: VectorEntry[]): Promise<void>;
  search(query: string, filter?: Record<string, string>, limit?: number): Promise<VectorEntry[]>;
  deleteByIds(ids: string[]): Promise<void>;
}

export interface VectorEntry {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

/**
 * Long-term memory backed by a vector store.
 */
export class VectorLongTermMemory implements ILongTermMemory {
  constructor(private readonly vectorStore: VectorStoreAdapter) {}

  async store(entries: MemoryEntry[]): Promise<void> {
    const vectorEntries: VectorEntry[] = entries.map((entry) => ({
      id: entry.id,
      content: entry.content,
      metadata: {
        ...entry.metadata,
        agentId: entry.agentId,
        timestamp: entry.timestamp,
      },
    }));
    await this.vectorStore.upsert(vectorEntries);
  }

  async search(query: string, agentId?: string, limit: number = 10): Promise<MemoryEntry[]> {
    const filter = agentId ? { agentId } : undefined;
    const results = await this.vectorStore.search(query, filter, limit);

    return results.map((r) => ({
      id: r.id,
      agentId: String(r.metadata["agentId"] ?? ""),
      content: r.content,
      metadata: r.metadata,
      timestamp: String(r.metadata["timestamp"] ?? new Date().toISOString()),
    }));
  }

  async delete(ids: string[]): Promise<void> {
    await this.vectorStore.deleteByIds(ids);
  }
}

/**
 * In-memory long-term memory for testing. Uses simple substring matching instead of vectors.
 */
export class InMemoryLongTermMemory implements ILongTermMemory {
  private readonly entries = new Map<string, MemoryEntry>();

  async store(entries: MemoryEntry[]): Promise<void> {
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
    }
  }

  async search(query: string, agentId?: string, limit: number = 10): Promise<MemoryEntry[]> {
    const queryLower = query.toLowerCase();
    const results: MemoryEntry[] = [];

    for (const entry of this.entries.values()) {
      if (agentId && entry.agentId !== agentId) continue;
      if (entry.content.toLowerCase().includes(queryLower)) {
        results.push(entry);
      }
      if (results.length >= limit) break;
    }

    return results;
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.entries.delete(id);
    }
  }
}
