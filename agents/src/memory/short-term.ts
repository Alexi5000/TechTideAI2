/**
 * Short-Term Memory Implementation
 *
 * In-memory conversation buffer scoped per agent + session.
 * Bounded to prevent unbounded growth.
 */

import type { IShortTermMemory, MemoryEntry } from "./types.js";

const DEFAULT_MAX_ENTRIES = 50;

export class InMemoryShortTermMemory implements IShortTermMemory {
  private readonly store = new Map<string, MemoryEntry[]>();
  private readonly maxEntries: number;

  constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  private key(agentId: string, sessionId: string): string {
    return `${agentId}:${sessionId}`;
  }

  add(agentId: string, sessionId: string, entry: MemoryEntry): void {
    const k = this.key(agentId, sessionId);
    const entries = this.store.get(k) ?? [];
    entries.push(entry);

    // Trim to max entries (keep most recent)
    if (entries.length > this.maxEntries) {
      entries.splice(0, entries.length - this.maxEntries);
    }

    this.store.set(k, entries);
  }

  recall(agentId: string, sessionId: string, limit?: number): MemoryEntry[] {
    const k = this.key(agentId, sessionId);
    const entries = this.store.get(k) ?? [];
    if (limit !== undefined && limit < entries.length) {
      return entries.slice(-limit);
    }
    return [...entries];
  }

  clear(agentId: string, sessionId: string): void {
    const k = this.key(agentId, sessionId);
    this.store.delete(k);
  }
}
