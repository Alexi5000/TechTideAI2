import { describe, expect, it } from "vitest";

import { createRunService } from "./run-service.js";
import {
  InvalidStatusTransitionError,
  RunNotFoundError,
} from "../domain/index.js";
import type { IRunRepository, UpdateRunStatusInput } from "../repositories/types.js";
import type { Run, RunEvent } from "../domain/index.js";

class InMemoryRunRepo implements IRunRepository {
  runs = new Map<string, Run>();
  events: RunEvent[] = [];

  async create(input: { orgId: string; agentId: string; input: Record<string, unknown> }): Promise<Run> {
    const now = new Date().toISOString();
    const run: Run = {
      id: `r-${this.runs.size + 1}`,
      orgId: input.orgId,
      agentId: input.agentId,
      status: "queued",
      input: input.input,
      output: null,
      error: null,
      startedAt: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.runs.set(run.id, run);
    return run;
  }
  async findById(id: string) {
    return this.runs.get(id) ?? null;
  }
  async findByOrgId(orgId: string, limit = 50) {
    return [...this.runs.values()].filter((r) => r.orgId === orgId).slice(0, limit);
  }
  async updateStatus(id: string, updates: UpdateRunStatusInput) {
    const run = this.runs.get(id);
    if (!run) throw new Error("not found");
    const updated: Run = {
      ...run,
      status: updates.status,
      ...(updates.output !== undefined ? { output: updates.output } : {}),
      ...(updates.error !== undefined ? { error: updates.error } : {}),
      ...(updates.startedAt !== undefined ? { startedAt: updates.startedAt } : {}),
      ...(updates.finishedAt !== undefined ? { finishedAt: updates.finishedAt } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.runs.set(id, updated);
    return updated;
  }
  async addEvent(
    runId: string,
    orgId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const evt: RunEvent = {
      id: `e-${this.events.length + 1}`,
      runId,
      orgId,
      eventType,
      payload,
      createdAt: new Date().toISOString(),
    };
    this.events.push(evt);
    return evt;
  }
  async findEventsByRunId(runId: string) {
    return this.events.filter((e) => e.runId === runId);
  }
}

function makeService() {
  const repo = new InMemoryRunRepo();
  const service = createRunService(repo);
  return { repo, service };
}

describe("RunService event wiring (Phase 2.1)", () => {
  it("createRun emits a run.created event", async () => {
    const { service, repo } = makeService();
    await service.createRun({
      orgId: "00000000-0000-0000-0000-000000000001",
      agentId: "orch-cipher",
      input: { prompt: "Q3 forecast" },
    });
    expect(repo.events).toHaveLength(1);
    expect(repo.events[0]!.eventType).toBe("run.created");
  });

  it("startRun emits run.started with fromStatus=queued", async () => {
    const { service, repo } = makeService();
    const run = await service.createRun({
      orgId: "00000000-0000-0000-0000-000000000001",
      agentId: "orch-cipher",
      input: {},
    });
    repo.events.length = 0; // reset
    await service.startRun(run.id);
    expect(repo.events.map((e) => e.eventType)).toEqual(["run.started"]);
    expect(repo.events[0]!.payload["fromStatus"]).toBe("queued");
    expect(repo.events[0]!.payload["toStatus"]).toBe("running");
  });

  it("completeRun emits run.completed with the output", async () => {
    const { service, repo } = makeService();
    const run = await service.createRun({
      orgId: "00000000-0000-0000-0000-000000000001",
      agentId: "orch-cipher",
      input: {},
    });
    await service.startRun(run.id);
    repo.events.length = 0;
    await service.completeRun(run.id, { answer: 42 });
    const completion = repo.events.find((e) => e.eventType === "run.completed");
    expect(completion).toBeDefined();
    expect(completion!.payload["toStatus"]).toBe("succeeded");
  });

  it("failRun emits run.failed with severity=error", async () => {
    const { service, repo } = makeService();
    const run = await service.createRun({
      orgId: "00000000-0000-0000-0000-000000000001",
      agentId: "orch-cipher",
      input: {},
    });
    await service.startRun(run.id);
    repo.events.length = 0;
    await service.failRun(run.id, "boom", { severity: "error" });
    const failure = repo.events.find((e) => e.eventType === "run.failed");
    expect(failure).toBeDefined();
    expect(failure!.payload["error"]).toBe("boom");
  });

  it("rejects illegal transitions with InvalidStatusTransitionError", async () => {
    const { service } = makeService();
    const run = await service.createRun({
      orgId: "00000000-0000-0000-0000-000000000001",
      agentId: "orch-cipher",
      input: {},
    });
    // queued → succeeded is illegal in the default policy.
    await expect(service.completeRun(run.id, {})).rejects.toBeInstanceOf(
      InvalidStatusTransitionError,
    );
  });

  it("rejects unknown run id with RunNotFoundError", async () => {
    const { service } = makeService();
    await expect(service.startRun("missing")).rejects.toBeInstanceOf(RunNotFoundError);
  });

  it("cancelRun is legal from queued or running", async () => {
    const { service, repo } = makeService();
    const run = await service.createRun({
      orgId: "00000000-0000-0000-0000-000000000001",
      agentId: "orch-cipher",
      input: {},
    });
    repo.events.length = 0;
    await service.cancelRun(run.id);
    const cancel = repo.events.find((e) => e.eventType === "run.canceled");
    expect(cancel).toBeDefined();
  });
});
