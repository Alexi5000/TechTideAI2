/**
 * Pipeline Registry
 *
 * Pre-registered pipeline definitions that compose agent orchestration
 * patterns using the existing agent hierarchy.
 */

import type { PipelineStep, ParallelBranch, RouteMap } from "./types.js";

// ---------------------------------------------------------------------------
// Pipeline Definition Types
// ---------------------------------------------------------------------------

export type PipelinePattern = "chain" | "parallel" | "route" | "eval-loop";

export interface ChainConfig {
  steps: PipelineStep[];
}

export interface ParallelConfig {
  branches: ParallelBranch[];
  concurrency?: number;
  retries?: number;
}

export interface RouteConfig {
  classifierAgentId: string;
  categories: string[];
  routeMap: RouteMap;
  fallbackAgentId?: string;
  confidenceThreshold?: number;
}

export interface EvalLoopConfig {
  generatorAgentId: string;
  evaluatorAgentId: string;
  maxIterations: number;
  threshold: number;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  description: string;
  pattern: PipelinePattern;
  config: ChainConfig | ParallelConfig | RouteConfig | EvalLoopConfig;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const pipelines = new Map<string, PipelineDefinition>();

/**
 * Register a pipeline definition. Overwrites if ID already exists.
 */
export function registerPipeline(definition: PipelineDefinition): void {
  pipelines.set(definition.id, definition);
}

/**
 * Get a pipeline definition by ID.
 */
export function getPipeline(id: string): PipelineDefinition | undefined {
  return pipelines.get(id);
}

/**
 * List all registered pipeline definitions.
 */
export function listPipelines(): PipelineDefinition[] {
  return [...pipelines.values()];
}

// ---------------------------------------------------------------------------
// Seed: Built-in pipelines using the existing agent hierarchy
// ---------------------------------------------------------------------------

registerPipeline({
  id: "ceo-strategic-review",
  name: "CEO Strategic Review",
  description: "Chain: CEO analyzes strategy, then Veronica orchestrates action items.",
  pattern: "chain",
  config: {
    steps: [
      { agentId: "ceo" },
      { agentId: "orch-veronica" },
    ],
  } satisfies ChainConfig,
});

registerPipeline({
  id: "parallel-research",
  name: "Parallel Research Sprint",
  description: "Run research, QA, and data workers in parallel for comprehensive analysis.",
  pattern: "parallel",
  config: {
    branches: [
      { key: "research", agentId: "worker-research", input: {} },
      { key: "qa", agentId: "worker-qa", input: {} },
      { key: "data", agentId: "worker-data", input: {} },
    ],
    concurrency: 3,
    retries: 1,
  } satisfies ParallelConfig,
});

registerPipeline({
  id: "domain-routing",
  name: "Domain Router",
  description: "Route input to the correct orchestrator domain based on content classification.",
  pattern: "route",
  config: {
    classifierAgentId: "ceo",
    categories: [
      "operations",
      "hr",
      "finance",
      "sales",
      "marketing",
      "support",
      "audit",
      "content",
    ],
    routeMap: {
      operations: "orch-ava",
      hr: "orch-finn",
      finance: "orch-cipher",
      sales: "orch-axel",
      marketing: "orch-luna",
      support: "orch-ellie",
      audit: "orch-audit",
      content: "orch-content",
    },
    fallbackAgentId: "orch-veronica",
    confidenceThreshold: 0.5,
  } satisfies RouteConfig,
});

registerPipeline({
  id: "content-optimization",
  name: "Content Optimization Loop",
  description: "Generate content with a content worker, evaluate with audit, iterate until quality threshold.",
  pattern: "eval-loop",
  config: {
    generatorAgentId: "worker-content-writer",
    evaluatorAgentId: "worker-audit-process",
    maxIterations: 3,
    threshold: 0.8,
  } satisfies EvalLoopConfig,
});
