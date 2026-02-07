/**
 * Evaluation Dataset Management
 *
 * Utilities for loading, validating, and creating evaluation datasets.
 */

import type { EvalCase, EvalDataset } from "./types.js";

/**
 * Create a new evaluation dataset.
 */
export function createDataset(
  name: string,
  cases: EvalCase[],
): EvalDataset {
  return {
    id: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    cases,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate a dataset structure. Throws on invalid data.
 */
export function validateDataset(dataset: unknown): asserts dataset is EvalDataset {
  if (!dataset || typeof dataset !== "object") {
    throw new Error("Dataset must be an object");
  }

  const d = dataset as Record<string, unknown>;

  if (typeof d["id"] !== "string" || d["id"].length === 0) {
    throw new Error("Dataset must have a non-empty 'id' string");
  }

  if (typeof d["name"] !== "string" || d["name"].length === 0) {
    throw new Error("Dataset must have a non-empty 'name' string");
  }

  if (!Array.isArray(d["cases"])) {
    throw new Error("Dataset must have a 'cases' array");
  }

  for (const c of d["cases"] as unknown[]) {
    validateCase(c);
  }
}

function validateCase(c: unknown): asserts c is EvalCase {
  if (!c || typeof c !== "object") {
    throw new Error("Each case must be an object");
  }

  const caseObj = c as Record<string, unknown>;

  if (typeof caseObj["id"] !== "string") {
    throw new Error("Each case must have an 'id' string");
  }

  if (typeof caseObj["agentId"] !== "string") {
    throw new Error("Each case must have an 'agentId' string");
  }

  if (!caseObj["input"] || typeof caseObj["input"] !== "object") {
    throw new Error("Each case must have an 'input' object");
  }
}

/**
 * Parse a JSON string into a validated EvalDataset.
 */
export function parseDatasetJson(json: string): EvalDataset {
  const parsed: unknown = JSON.parse(json);
  validateDataset(parsed);
  return parsed;
}
