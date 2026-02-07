/**
 * Memory System Types
 *
 * Defines contracts for short-term (session) and long-term (persistent) memory.
 */

export interface MemoryEntry {
  id: string;
  agentId: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface IShortTermMemory {
  add(agentId: string, sessionId: string, entry: MemoryEntry): void;
  recall(agentId: string, sessionId: string, limit?: number): MemoryEntry[];
  clear(agentId: string, sessionId: string): void;
}

export interface ILongTermMemory {
  store(entries: MemoryEntry[]): Promise<void>;
  search(query: string, agentId?: string, limit?: number): Promise<MemoryEntry[]>;
  delete(ids: string[]): Promise<void>;
}
