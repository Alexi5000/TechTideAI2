import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PostMortemService } from "./post-mortem-service.js";
import type { IRunRepository, UpdateRunStatusInput } from "../repositories/types.js";
import type { Run, RunEvent } from "../domain/index.js";

let workDir: string;

class FakeRunRepo implements IRunRepository {
  runs = new Map<string, Run>();
  events: RunEvent[] = [];
  async create(input: { orgId: string; agentId: string; input: Record<string, unknown> }): Promise<Run> {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.runs.set(run.id, run);
    return run;
  }
  async findById(id: string) {
    return this.runs.get(id) ?? null;
  }
  async findByOrgId(orgId: string, limit?: number) {
    return [...this.runs.values()].filter((r) => r.orgId === orgId).slice(0, limit ?? 50);
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
    _orgId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<RunEvent> {
    const evt: RunEvent = {
      id: `e-${this.events.length + 1}`,
      runId,
      orgId: this.runs.get(runId)!.orgId,
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

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "postmortem-"));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("PostMortemService", () => {
  it("writes a markdown post-mortem for a completed run", async () => {
    const repo = new FakeRunRepo();
    const run = await repo.create({ orgId: "00000000-0000-0000-0000-000000000001", agentId: "orch-centaurus-a", input: { prompt: "Q3 forecast" } });
    await repo.updateStatus(run.id, { status: "running", startedAt: new Date().toISOString() });
    await repo.addEvent(run.id, run.orgId, "agent.tool_call", { tool: "finance-ledger" });
    await repo.addEvent(run.id, run.orgId, "agent.message", { role: "assistant" });
    await repo.updateStatus(run.id, { status: "succeeded", finishedAt: new Date().toISOString(), output: { answer: "forecast: $304,679" } });

    const completed = await repo.findById(run.id);
    const service = new PostMortemService({ runRepository: repo, outputDir: workDir });
    const path = await service.generate(completed!);

    const md = await readFile(path, "utf8");
    expect(md).toMatch(/# Post-mortem: r-1/);
    expect(md).toMatch(/Status: \*\*succeeded\*\*/);
    expect(md).toMatch(/## Event Timeline/);
    expect(md).toMatch(/agent.tool_call/);
    expect(md).toMatch(/## Output/);
    expect(md).toMatch(/forecast: \$304,679/);
    expect(md).toMatch(/## Reflection/);
  });

  it("calls the judge when supplied", async () => {
    const repo = new FakeRunRepo();
    const run = await repo.create({ orgId: "00000000-0000-0000-0000-000000000001", agentId: "ceo", input: { prompt: "decision" } });
    await repo.updateStatus(run.id, { status: "succeeded", output: { answer: "yes" } });

    const judge = (text: string) => Promise.resolve(`reflected on: ${text.slice(0, 20)}…`);
    const service = new PostMortemService({ runRepository: repo, outputDir: workDir, judge });
    const path = await service.generate((await repo.findById(run.id))!);

    const md = await readFile(path, "utf8");
    expect(md).toMatch(/## LLM Reflection/);
    expect(md).toMatch(/reflected on:/);
  });
});
