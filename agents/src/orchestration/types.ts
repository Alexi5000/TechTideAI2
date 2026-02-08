/**
 * Orchestration Types
 *
 * Defines the contracts for composable agent orchestration patterns:
 * chain, parallel, route, and eval-loop. All primitives depend on
 * IAgentRuntime (abstraction), never on MastraRuntime (concrete).
 */

import type { AgentRunResult } from "../runtime/types.js";
import type { ITracer } from "../monitoring/types.js";

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export interface PipelineStep {
  /** Agent ID to execute */
  agentId: string;
  /** Transform previous output into this step's input */
  mapInput?: (previousOutput: Record<string, unknown>) => Record<string, unknown>;
  /** Timeout override for this step (ms) */
  timeoutMs?: number;
}

export interface StepResult {
  stepIndex: number;
  agentId: string;
  result: AgentRunResult;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Chain (Pattern #1)
// ---------------------------------------------------------------------------

export interface ChainOptions {
  signal?: AbortSignal;
  tracer?: ITracer;
}

export interface ChainResult {
  success: boolean;
  output: Record<string, unknown>;
  stepResults: StepResult[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Parallel (Pattern #2)
// ---------------------------------------------------------------------------

export interface ParallelBranch {
  key: string;
  agentId: string;
  input: Record<string, unknown>;
}

export interface ParallelOptions {
  /** Max concurrent branches (default: all at once) */
  concurrency?: number;
  /** Retry failed branches up to N times (default: 0) */
  retries?: number;
  signal?: AbortSignal;
  tracer?: ITracer;
}

export interface BranchResult {
  key: string;
  agentId: string;
  result: AgentRunResult;
  durationMs: number;
  attempts: number;
}

export interface ParallelResult {
  success: boolean;
  branches: Record<string, BranchResult>;
  succeeded: number;
  failed: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Routing (Pattern #3)
// ---------------------------------------------------------------------------

export interface RouteClassification {
  category: string;
  confidence: number;
}

export type Classifier = (
  input: Record<string, unknown>,
) => Promise<RouteClassification>;

export type RouteMap = Record<string, string>;

export interface RouteOptions {
  fallbackAgentId?: string;
  /** Minimum confidence to accept classification (0-1, default: 0) */
  confidenceThreshold?: number;
  signal?: AbortSignal;
  tracer?: ITracer;
}

export interface RouteResult {
  success: boolean;
  classification: RouteClassification;
  selectedAgentId: string;
  result: AgentRunResult;
  durationMs: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Evaluator-Optimizer (Pattern #5)
// ---------------------------------------------------------------------------

export type EvalFn = (
  output: Record<string, unknown>,
) => Promise<{ score: number; feedback: string }>;

export interface EvalLoopOptions {
  maxIterations: number;
  threshold: number;
  signal?: AbortSignal;
  tracer?: ITracer;
}

export interface EvalIteration {
  iteration: number;
  output: Record<string, unknown>;
  score: number;
  feedback: string;
  durationMs: number;
}

export interface EvalLoopResult {
  success: boolean;
  output: Record<string, unknown>;
  iterations: number;
  finalScore: number;
  history: EvalIteration[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Invoke-Agent (Pattern #4 support)
// ---------------------------------------------------------------------------

export interface InvokeAgentInput {
  agentId: string;
  input: Record<string, unknown>;
}

export interface InvokeAgentOutput {
  agentId: string;
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
  durationMs: number;
}
