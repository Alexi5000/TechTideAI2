/**
 * Eval Suite Loader - File-system backed.
 *
 * Suites live as JSON files under `evals/fixtures/*.json`. The loader reads,
 * Zod-validates, and returns an `EvalSuite`. Fixtures are versioned by the
 * `version` field; a `golden-tasks.v1.json` is the canonical initial suite.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseEvalSuite, type EvalSuite } from "../domain/entities/eval-suite.js";
import { EvalSuiteNotFoundError } from "../domain/index.js";

const DEFAULT_FIXTURES_DIR = resolve(process.cwd(), "../../evals/fixtures");

export interface LoadSuiteOptions {
  fixturesDir?: string | undefined;
}

export async function loadSuite(
  suiteId: string,
  options: LoadSuiteOptions = {},
): Promise<EvalSuite> {
  const fixturesDir = options.fixturesDir ?? DEFAULT_FIXTURES_DIR;
  const candidatePaths = [
    resolve(fixturesDir, `${suiteId}.json`),
    resolve(fixturesDir, `${suiteId}.v1.json`),
  ];

  for (const path of candidatePaths) {
    try {
      const raw = await readFile(path, "utf8");
      const data = JSON.parse(raw);
      const suite = parseEvalSuite(data);
      // Accept the file if either:
      //   - the suite id matches the requested id exactly, or
      //   - the requested id is a superset (e.g. "smoke.v1" → suite id "smoke"), or
      //   - the filename carries the suite id (e.g. "smoke.v1.json" for suite id "smoke").
      const idMatches = suite.id === suiteId;
      const idIsPrefix = suiteId.startsWith(`${suite.id}.`) || suiteId.startsWith(`${suite.id}-`);
      const fileMatches = path.endsWith(`${suite.id}.json`);
      if (!idMatches && !idIsPrefix && !fileMatches) continue;
      return suite;
    } catch {
      // Try the next candidate path.
    }
  }

  throw new EvalSuiteNotFoundError(suiteId);
}

export async function loadDefaultSuite(options: LoadSuiteOptions = {}): Promise<EvalSuite> {
  return loadSuite("golden-tasks.v1", options);
}
