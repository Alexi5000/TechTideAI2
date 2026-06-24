import { describe, expect, it } from "vitest";

import {
  createInMemorySprintRepository,
  deriveSprintStatusFromIterations,
  newSprintRunId,
} from "./sprint-repository.js";
import { emptySprintResult } from "../domain/entities/sprint-result.js";

function makeRun(contractId: string, startedAt: string) {
  return { ...emptySprintResult({ id: newSprintRunId(), contractId, contractVersion: "v1", startedAt }), startedAt };
}

describe("InMemorySprintRepository (Phase 8.4)", () => {
  it("saves and finds by id", async () => {
    const repo = createInMemorySprintRepository();
    const run = makeRun("c1", "2026-06-23T00:00:00.000Z");
    await repo.save(run);
    expect(await repo.findById(run.id)).toEqual(run);
  });

  it("lists by contract in reverse-chronological order", async () => {
    const repo = createInMemorySprintRepository();
    await repo.save(makeRun("c1", "2026-06-01T00:00:00.000Z"));
    await repo.save(makeRun("c2", "2026-06-02T00:00:00.000Z"));
    await repo.save(makeRun("c1", "2026-06-03T00:00:00.000Z"));
    const c1 = await repo.listByContract("c1", 10);
    expect(c1).toHaveLength(2);
    expect(c1[0]!.startedAt).toBe("2026-06-03T00:00:00.000Z");
  });

  it("returns the latest run for a contract", async () => {
    const repo = createInMemorySprintRepository();
    await repo.save(makeRun("c1", "2026-06-01T00:00:00.000Z"));
    await repo.save(makeRun("c1", "2026-06-10T00:00:00.000Z"));
    const latest = await repo.findLatestByContract("c1");
    expect(latest?.startedAt).toBe("2026-06-10T00:00:00.000Z");
  });

  it("returns null when no run matches", async () => {
    const repo = createInMemorySprintRepository();
    expect(await repo.findLatestByContract("nope")).toBeNull();
  });
});

describe("deriveSprintStatusFromIterations", () => {
  it("returns 'errored' when there are no iterations", () => {
    expect(deriveSprintStatusFromIterations([], false, false)).toBe("errored");
  });
  it("returns 'succeeded' when any iteration passed", () => {
    expect(
      deriveSprintStatusFromIterations(
        [
          { taskResult: { passed: false, score: 0.4 } },
          { taskResult: { passed: true, score: 0.8 } },
        ],
        false,
        true,
      ),
    ).toBe("succeeded");
  });
  it("returns 'plateau' when last iter plateaued and none passed", () => {
    expect(
      deriveSprintStatusFromIterations(
        [
          { taskResult: { passed: false, score: 0.5 } },
          { taskResult: { passed: false, score: 0.5 } },
        ],
        true,
        false,
      ),
    ).toBe("plateau");
  });
  it("returns 'max-iterations' when exhausted without plateau or pass", () => {
    expect(
      deriveSprintStatusFromIterations(
        [
          { taskResult: { passed: false, score: 0.4 } },
          { taskResult: { passed: false, score: 0.5 } },
        ],
        false,
        true,
      ),
    ).toBe("max-iterations");
  });
  it("returns 'failed' as a last resort", () => {
    expect(
      deriveSprintStatusFromIterations(
        [{ taskResult: { passed: false, score: 0.4 } }],
        false,
        false,
      ),
    ).toBe("failed");
  });
});
