/**
 * Scorer registry factory.
 *
 * Single source of truth for "which scorers exist, at which versions". The eval
 * harness reads `ScorerRegistry.versions()` to record `scorerVersions` on each
 * `EvalRun`, which makes "did this regression come from a scorer bump?" a
 * queryable signal instead of a guess.
 *
 * Adding a new scorer:
 *   1. Implement `Scorer` in `interfaces.ts`.
 *   2. Register it in `defaultScorerRegistry()` below with a version string.
 *   3. (Optional) add an `ScorerSpec` entry to a suite's `scorers` array.
 *
 * Phase 8: `four-axis-grader` aggregates the 4 axis scores (correctness,
 * safety, completeness, quality) that the three-agent harness publishes on the
 * inner scorer's `meta`. `plateau-scorer` is a wrapper used by the three-agent
 * loop; it does not score an output directly.
 */

import { ScorerRegistry } from "../../domain/policies/scorer-policy.js";
import type { Scorer } from "./interfaces.js";
import { ExactMatchScorer } from "./exact-match.js";
import { RegexScorer } from "./regex.js";
import { JsonSchemaScorer } from "./json-schema.js";
import { LlmJudgeScorer, JUDGE_PROMPT_VERSION } from "./llm-judge.js";
import { RubricWeightedScorer } from "./rubric-weighted.js";
import { FourAxisGrader } from "./four-axis-grader.js";
import { PlateauScorer } from "./plateau-scorer.js";

export const SCORER_VERSIONS = {
  "exact-match": "1.0.0",
  regex: "1.0.0",
  "json-schema": "1.0.0",
  "llm-judge": JUDGE_PROMPT_VERSION,
  "rubric-weighted": "1.0.0",
  "four-axis-grader": "1.0.0",
  "plateau-scorer": "1.0.0",
} as const;

export function defaultScorerRegistry(): ScorerRegistry<Scorer> {
  const registry = new ScorerRegistry<Scorer>();
  registry.register({
    kind: "exact-match",
    version: SCORER_VERSIONS["exact-match"],
    factory: () => new ExactMatchScorer(),
  });
  registry.register({
    kind: "regex",
    version: SCORER_VERSIONS.regex,
    factory: () => new RegexScorer(),
  });
  registry.register({
    kind: "json-schema",
    version: SCORER_VERSIONS["json-schema"],
    factory: () => new JsonSchemaScorer(),
  });
  registry.register({
    kind: "llm-judge",
    version: SCORER_VERSIONS["llm-judge"],
    factory: () => new LlmJudgeScorer(),
  });
  registry.register({
    kind: "rubric-weighted",
    version: SCORER_VERSIONS["rubric-weighted"],
    factory: () => new RubricWeightedScorer(),
  });
  registry.register({
    kind: "four-axis-grader",
    version: SCORER_VERSIONS["four-axis-grader"],
    factory: () => new FourAxisGrader(),
  });
  registry.register({
    kind: "plateau-scorer",
    version: SCORER_VERSIONS["plateau-scorer"],
    factory: () => new PlateauScorer({ inner: new LlmJudgeScorer() }),
  });
  return registry;
}

export type { Scorer } from "./interfaces.js";
export { ExactMatchScorer } from "./exact-match.js";
export { RegexScorer } from "./regex.js";
export { JsonSchemaScorer } from "./json-schema.js";
export { LlmJudgeScorer, JUDGE_PROMPT_VERSION } from "./llm-judge.js";
export { RubricWeightedScorer } from "./rubric-weighted.js";
export { FourAxisGrader, DEFAULT_AXIS_THRESHOLDS, DEFAULT_AXIS_WEIGHTS, FOUR_AXES } from "./four-axis-grader.js";
export type { FourAxis } from "./four-axis-grader.js";
export { PlateauScorer } from "./plateau-scorer.js";
