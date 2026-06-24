/**
 * Sprint suite loader - file-system backed.
 *
 * Mirrors `eval-suite-loader.ts` but for `SprintContract` files under
 * `evals/sprints/`. The harness CLI loads a contract by id, parses it
 * with the Zod schema, and runs the three-agent loop.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseSprintContract, type SprintContract } from "../domain/entities/sprint-contract.js";

const DEFAULT_SPRINTS_DIR = resolve(process.cwd(), "../../evals/sprints");

export interface LoadSprintOptions {
  sprintsDir?: string;
}

export async function loadSprint(
  contractId: string,
  options: LoadSprintOptions = {},
): Promise<SprintContract> {
  const dir = options.sprintsDir ?? DEFAULT_SPRINTS_DIR;
  // Try `${id}.v1.json`, then `${id}.json`, then `${id}` as-is.
  const candidates = [
    resolve(dir, `${contractId}.v1.json`),
    resolve(dir, `${contractId}.json`),
  ];
  let lastErr: Error | null = null;
  for (const path of candidates) {
    try {
      const raw = await readFile(path, "utf8");
      return parseSprintContract(JSON.parse(raw));
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw new Error(
    `sprint contract not found: ${contractId} (tried ${candidates.join(", ")}). Last error: ${lastErr?.message ?? "unknown"}`,
  );
}
