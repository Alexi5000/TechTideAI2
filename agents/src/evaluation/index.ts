/**
 * Evaluation Framework Module
 *
 * Provides agent evaluation capabilities: datasets, runners, and scoring.
 */

export type {
  EvalCase,
  EvalDataset,
  EvalResult,
  EvalReport,
  Scorer,
  EvalRunnerOptions,
} from "./types.js";

export { EvalRunner } from "./runner.js";
export { createDataset, validateDataset, parseDatasetJson } from "./dataset.js";
export {
  exactMatchScorer,
  containsScorer,
  jsonSchemaScorer,
  latencyScorer,
  createLatencyScorer,
} from "./scorer.js";
