import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadSuite } from "./eval-suite-loader.js";
import { EvalSuiteNotFoundError } from "../domain/index.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "eval-loader-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("loadSuite", () => {
  it("loads a suite from a fixture file", async () => {
    await writeFile(
      join(dir, "smoke.v1.json"),
      JSON.stringify({
        id: "smoke",
        name: "Smoke",
        version: "v1.0.0",
        description: "",
        publishedAt: "2026-06-22T00:00:00.000Z",
        scorers: [{ kind: "exact-match", weight: 1, passThreshold: 0.7, options: {} }],
        tasks: [
          {
            id: "t1",
            agentId: "ceo",
            tier: "ceo",
            category: "format-compliance",
            difficulty: 1,
            input: {},
            expected: { exact: { ok: true } },
            rubric: "ok",
            tags: [],
            timeoutMs: 5000,
          },
        ],
      }),
    );

    const suite = await loadSuite("smoke.v1", { fixturesDir: dir });
    expect(suite.id).toBe("smoke");
    expect(suite.tasks).toHaveLength(1);
  });

  it("throws EvalSuiteNotFoundError when the fixture is missing", async () => {
    await expect(loadSuite("nope", { fixturesDir: dir })).rejects.toBeInstanceOf(
      EvalSuiteNotFoundError,
    );
  });

  it("rejects malformed fixtures", async () => {
    await writeFile(join(dir, "bad.v1.json"), JSON.stringify({ id: "bad" }));
    await expect(loadSuite("bad.v1", { fixturesDir: dir })).rejects.toThrow();
  });
});
