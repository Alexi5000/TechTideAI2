/**
 * Exact-match scorer.
 *
 * Compares the agent output against `expected.exact`. Output is normalized via
 * `JSON.stringify` so an object that JSON-serializes identically to the expected
 * counts as a match. Returns 1.0 / passed when output equals expected,
 * 0.0 / not-passed otherwise. Rationale explains which side of the comparison
 * was the source of the gap.
 */

import type { ScorerContext, ScoringResult } from "./interfaces.js";
import { Scorer } from "./interfaces.js";

export class ExactMatchScorer implements Scorer {
  readonly kind = "exact-match" as const;

  async score({ expected, agentOutput }: ScorerContext): Promise<ScoringResult> {
    const start = Date.now();
    if (expected.exact === undefined) {
      return {
        score: 1,
        passed: true,
        rationale: "no expected.exact provided; scorer is a no-op",
        durationMs: Date.now() - start,
      };
    }

    const expectedJson = safeStringify(expected.exact);
    const actualJson = safeStringify(agentOutput);

    if (expectedJson === actualJson) {
      return {
        score: 1,
        passed: true,
        rationale: "exact match",
        durationMs: Date.now() - start,
      };
    }

    return {
      score: 0,
      passed: false,
      rationale: `expected ${truncate(expectedJson)}; got ${truncate(actualJson)}`,
      durationMs: Date.now() - start,
    };
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, replacer);
  } catch {
    return String(value);
  }
}

function replacer(_key: string, value: unknown): unknown {
  if (value === undefined) return null;
  return value;
}

function truncate(s: string, max = 200): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
