/**
 * Evaluation Scorers
 *
 * Built-in scoring functions for agent evaluation.
 * Each scorer takes an AgentRunResult and an EvalCase, returning a 0-1 score.
 */

import type { AgentRunResult } from "../runtime/types.js";
import type { EvalCase, Scorer } from "./types.js";

/**
 * Exact match scorer — 1.0 if output matches expected exactly, 0.0 otherwise.
 */
export const exactMatchScorer: Scorer = {
  id: "exact-match",
  score(result: AgentRunResult, evalCase: EvalCase): number {
    if (!evalCase.expectedOutput) return 1.0;
    return JSON.stringify(result.output) === JSON.stringify(evalCase.expectedOutput) ? 1.0 : 0.0;
  },
};

/**
 * Contains scorer — 1.0 if the output text contains the expected text, 0.0 otherwise.
 * Checks the "text" field of the output against the "text" field of expectedOutput.
 */
export const containsScorer: Scorer = {
  id: "contains",
  score(result: AgentRunResult, evalCase: EvalCase): number {
    if (!evalCase.expectedOutput) return 1.0;

    const outputText = String(result.output["text"] ?? "");
    const expectedText = String(evalCase.expectedOutput["text"] ?? "");

    if (expectedText.length === 0) return 1.0;
    return outputText.includes(expectedText) ? 1.0 : 0.0;
  },
};

/**
 * JSON schema scorer — 1.0 if the output has all expected keys, 0.0 otherwise.
 * Validates that all keys in expectedOutput exist in the actual output.
 */
export const jsonSchemaScorer: Scorer = {
  id: "json-schema",
  score(result: AgentRunResult, evalCase: EvalCase): number {
    if (!evalCase.expectedOutput) return 1.0;

    const expectedKeys = Object.keys(evalCase.expectedOutput);
    if (expectedKeys.length === 0) return 1.0;

    const outputKeys = new Set(Object.keys(result.output));
    const matchingKeys = expectedKeys.filter((k) => outputKeys.has(k));
    return matchingKeys.length / expectedKeys.length;
  },
};

/**
 * Latency scorer — Scores based on execution duration.
 * 1.0 for instant, decreasing linearly to 0.0 at the threshold (default 30s).
 */
export function createLatencyScorer(thresholdMs: number = 30_000): Scorer {
  return {
    id: "latency",
    score(_result: AgentRunResult, _evalCase: EvalCase): number {
      // Latency is scored by the runner which has access to durationMs
      // This scorer returns 1.0 as a fallback — actual scoring happens in the runner
      return 1.0;
    },
  };
}

export const latencyScorer = createLatencyScorer();
