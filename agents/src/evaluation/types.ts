/**
 * Evaluation Framework Types
 *
 * Defines contracts for agent evaluation: datasets, results, scoring, and reports.
 */

import type { AgentRunResult } from "../runtime/types.js";

export interface EvalCase {
  id: string;
  agentId: string;
  input: Record<string, unknown>;
  expectedOutput?: Record<string, unknown> | undefined;
  tags?: string[] | undefined;
}

export interface EvalDataset {
  id: string;
  name: string;
  cases: EvalCase[];
  createdAt: string;
}

export interface EvalResult {
  caseId: string;
  agentId: string;
  output: Record<string, unknown>;
  scores: Record<string, number>;
  durationMs: number;
  error?: string | undefined;
}

export interface EvalReport {
  datasetId: string;
  results: EvalResult[];
  summary: {
    totalCases: number;
    passed: number;
    failed: number;
    averageScores: Record<string, number>;
    averageDurationMs: number;
  };
}

export interface Scorer {
  id: string;
  score(result: AgentRunResult, evalCase: EvalCase): number;
}

export interface EvalRunnerOptions {
  concurrency?: number | undefined;
}
