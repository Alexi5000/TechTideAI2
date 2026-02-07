import { describe, expect, it, vi } from "vitest";
import { InMemoryShortTermMemory } from "./short-term.js";
import { InMemoryLongTermMemory, VectorLongTermMemory, type VectorStoreAdapter } from "./long-term.js";
import type { MemoryEntry } from "./types.js";

function createEntry(id: string, agentId: string, content: string): MemoryEntry {
  return {
    id,
    agentId,
    content,
    metadata: {},
    timestamp: new Date().toISOString(),
  };
}

describe("InMemoryShortTermMemory", () => {
  it("adds and recalls entries in order", () => {
    const mem = new InMemoryShortTermMemory();
    const e1 = createEntry("1", "ceo", "first");
    const e2 = createEntry("2", "ceo", "second");

    mem.add("ceo", "session-1", e1);
    mem.add("ceo", "session-1", e2);

    const recalled = mem.recall("ceo", "session-1");
    expect(recalled).toHaveLength(2);
    expect(recalled[0]!.content).toBe("first");
    expect(recalled[1]!.content).toBe("second");
  });

  it("respects buffer limit", () => {
    const mem = new InMemoryShortTermMemory(3);

    for (let i = 0; i < 5; i++) {
      mem.add("ceo", "s1", createEntry(`${i}`, "ceo", `msg-${i}`));
    }

    const recalled = mem.recall("ceo", "s1");
    expect(recalled).toHaveLength(3);
    expect(recalled[0]!.content).toBe("msg-2");
    expect(recalled[2]!.content).toBe("msg-4");
  });

  it("clears entries by session", () => {
    const mem = new InMemoryShortTermMemory();
    mem.add("ceo", "s1", createEntry("1", "ceo", "hello"));
    mem.add("ceo", "s2", createEntry("2", "ceo", "world"));

    mem.clear("ceo", "s1");

    expect(mem.recall("ceo", "s1")).toHaveLength(0);
    expect(mem.recall("ceo", "s2")).toHaveLength(1);
  });

  it("recall with limit returns most recent entries", () => {
    const mem = new InMemoryShortTermMemory();
    for (let i = 0; i < 5; i++) {
      mem.add("ceo", "s1", createEntry(`${i}`, "ceo", `msg-${i}`));
    }

    const recalled = mem.recall("ceo", "s1", 2);
    expect(recalled).toHaveLength(2);
    expect(recalled[0]!.content).toBe("msg-3");
    expect(recalled[1]!.content).toBe("msg-4");
  });
});

describe("InMemoryLongTermMemory", () => {
  it("stores and searches entries", async () => {
    const mem = new InMemoryLongTermMemory();
    await mem.store([
      createEntry("1", "ceo", "quarterly revenue report"),
      createEntry("2", "ceo", "employee handbook"),
    ]);

    const results = await mem.search("revenue");
    expect(results).toHaveLength(1);
    expect(results[0]!.content).toBe("quarterly revenue report");
  });

  it("filters by agentId", async () => {
    const mem = new InMemoryLongTermMemory();
    await mem.store([
      createEntry("1", "ceo", "hello world"),
      createEntry("2", "orch-veronica", "hello there"),
    ]);

    const results = await mem.search("hello", "ceo");
    expect(results).toHaveLength(1);
    expect(results[0]!.agentId).toBe("ceo");
  });

  it("deletes entries by ID", async () => {
    const mem = new InMemoryLongTermMemory();
    await mem.store([
      createEntry("1", "ceo", "keep this"),
      createEntry("2", "ceo", "delete this"),
    ]);

    await mem.delete(["2"]);

    const results = await mem.search("this");
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("1");
  });
});

describe("VectorLongTermMemory", () => {
  it("delegates store to vector adapter", async () => {
    const adapter: VectorStoreAdapter = {
      upsert: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue([]),
      deleteByIds: vi.fn().mockResolvedValue(undefined),
    };

    const mem = new VectorLongTermMemory(adapter);
    await mem.store([createEntry("1", "ceo", "test")]);

    expect(adapter.upsert).toHaveBeenCalledOnce();
    const arg = (adapter.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(arg).toHaveLength(1);
    expect(arg[0].id).toBe("1");
  });

  it("delegates search to vector adapter", async () => {
    const adapter: VectorStoreAdapter = {
      upsert: vi.fn(),
      search: vi.fn().mockResolvedValue([
        { id: "1", content: "test result", metadata: { agentId: "ceo", timestamp: "2024-01-01" } },
      ]),
      deleteByIds: vi.fn(),
    };

    const mem = new VectorLongTermMemory(adapter);
    const results = await mem.search("test", "ceo", 5);

    expect(adapter.search).toHaveBeenCalledWith("test", { agentId: "ceo" }, 5);
    expect(results).toHaveLength(1);
    expect(results[0]!.agentId).toBe("ceo");
  });
});
