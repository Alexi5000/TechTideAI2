/**
 * Regex scorer.
 *
 * Asserts that the stringified agent output matches the regex in `expected.regex`.
 * Returns 1.0 when matched, 0.0 otherwise.
 */

import type { ScorerContext, ScoringResult } from "./interfaces.js";
import { Scorer } from "./interfaces.js";

export class RegexScorer implements Scorer {
  readonly kind = "regex" as const;

  async score({ expected, agentOutput }: ScorerContext): Promise<ScoringResult> {
    const start = Date.now();
    if (!expected.regex) {
      return {
        score: 1,
        passed: true,
        rationale: "no expected.regex provided; scorer is a no-op",
        durationMs: Date.now() - start,
      };
    }

    let regex: RegExp;
    try {
      regex = new RegExp(expected.regex, "m");
    } catch (err) {
      return {
        score: 0,
        passed: false,
        rationale: `invalid regex in fixture: ${(err as Error).message}`,
        durationMs: Date.now() - start,
      };
    }

    const text = stringifyForRegex(agentOutput);
    const matched = regex.test(text);
    return {
      score: matched ? 1 : 0,
      passed: matched,
      rationale: matched
        ? `output matched /${expected.regex}/m`
        : `output did not match /${expected.regex}/m`,
      durationMs: Date.now() - start,
    };
  }
}

function stringifyForRegex(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, (_k, v) => (v === undefined ? null : v));
  } catch {
    return String(value);
  }
}
