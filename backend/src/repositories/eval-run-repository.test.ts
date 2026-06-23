import { describe, expect, it } from "vitest";

import {
  createInMemoryEvalRunRepository,
  newEvalRunId,
} from "./eval-run-repository.js";
import { emptyEvalRun } from "../domain/entities/eval-run.js";

function buildRun(suiteId: string, status: "running" | "succeeded" | "failed" = "succeeded") {
  return {
    ...emptyEvalRun({
      id: newEvalRunId(),
      suiteId,
      suiteVersion: "v1.0.0",
      baselineId: null,
      modelVersions: { openai: "gpt-4o" },
      scorerVersions: { "exact-match": "1.0.0" },
    }),
    completedAt: new Date().toISOString(),
    status,
  };
}

describe("InMemoryEvalRunRepository", () => {
  it("saves and finds runs", async () => {
    const repo = createInMemoryEvalRunRepository();
    const run = buildRun("golden-tasks");
    await repo.save(run);
    expect(await repo.findById(run.id)).toEqual(run);
  });

  it("lists recent runs in reverse-chronological order", async () => {
    const repo = createInMemoryEvalRunRepository();
    const a = { ...buildRun("a"), startedAt: "2026-06-01T00:00:00.000Z" };
    const b = { ...buildRun("b"), startedAt: "2026-06-02T00:00:00.000Z" };
    const c = { ...buildRun("c"), startedAt: "2026-06-03T00:00:00.000Z" };
    await repo.save(a);
    await repo.save(b);
    await repo.save(c);
    const recent = await repo.listRecent(10);
    expect(recent.map((r) => r.id)).toEqual([c.id, b.id, a.id]);
  });

  it("filters by suite", async () => {
    const repo = createInMemoryEvalRunRepository();
    await repo.save(buildRun("a"));
    await repo.save(buildRun("b"));
    await repo.save(buildRun("a"));
    const aRuns = await repo.listBySuite("a", 10);
    expect(aRuns.every((r) => r.suiteId === "a")).toBe(true);
    expect(aRuns).toHaveLength(2);
  });

  it("returns the latest run for a suite", async () => {
    const repo = createInMemoryEvalRunRepository();
    const old = { ...buildRun("a"), startedAt: "2026-06-01T00:00:00.000Z" };
    const fresh = { ...buildRun("a"), startedAt: "2026-06-10T00:00:00.000Z" };
    await repo.save(old);
    await repo.save(fresh);
    const latest = await repo.findLatestBySuite("a");
    expect(latest?.id).toBe(fresh.id);
  });

  it("returns null when no runs match", async () => {
    const repo = createInMemoryEvalRunRepository();
    expect(await repo.findLatestBySuite("nope")).toBeNull();
  });
});
