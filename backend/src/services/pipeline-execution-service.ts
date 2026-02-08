/**
 * Pipeline Execution Service
 *
 * Orchestrates multi-agent pipeline execution using the orchestration
 * primitives (chain, parallel, route, evalLoop). Follows the same
 * pattern as AgentExecutionService: dependency injection, async
 * fire-and-forget, run lifecycle management.
 */

import type {
  IAgentRuntime,
  ChainResult,
  ParallelResult,
  RouteResult,
  EvalLoopResult,
  Classifier,
  EvalFn,
} from "@techtide/agents";
import {
  chain,
  parallel,
  route,
  evalLoop,
  getPipeline,
  listPipelines,
} from "@techtide/agents";
import type {
  ChainConfig,
  ParallelConfig,
  RouteConfig,
  EvalLoopConfig,
  PipelineDefinition,
} from "@techtide/agents";
import type { IRunService } from "./run-service.js";
import type { Run } from "../domain/index.js";
import type { ExecutionLogger } from "./agent-execution-service.js";

export interface IPipelineExecutionService {
  executePipeline(
    pipelineId: string,
    input: Record<string, unknown>,
    orgId: string,
  ): Promise<Run>;

  listAvailablePipelines(): PipelineDefinition[];
}

export interface PipelineExecutionServiceDeps {
  runService: IRunService;
  agentRuntime: IAgentRuntime;
  logger?: ExecutionLogger;
}

export function createPipelineExecutionService(
  deps: PipelineExecutionServiceDeps,
): IPipelineExecutionService {
  const { runService, agentRuntime, logger } = deps;

  /**
   * Build a classifier function from a RouteConfig.
   * Uses an agent to classify the input into categories.
   */
  function buildClassifier(config: RouteConfig): Classifier {
    return async (input) => {
      const result = await agentRuntime.execute({
        agentId: config.classifierAgentId,
        input: {
          ...input,
          classificationTask: `Classify this input into one of: ${config.categories.join(", ")}. Respond with JSON: { "category": "...", "confidence": 0.0-1.0 }`,
        },
      });

      if (!result.success) {
        return { category: "", confidence: 0 };
      }

      try {
        const text = String(result.output["text"] ?? "");
        const match = text.match(/\{[^}]*"category"\s*:\s*"([^"]+)"[^}]*"confidence"\s*:\s*([\d.]+)[^}]*\}/);
        if (match) {
          return {
            category: match[1]!,
            confidence: parseFloat(match[2]!),
          };
        }
      } catch {
        // Fall through to default
      }

      return { category: "", confidence: 0 };
    };
  }

  /**
   * Build an evaluator function from an EvalLoopConfig.
   * Uses an evaluator agent to score the output.
   */
  function buildEvaluator(config: EvalLoopConfig): EvalFn {
    return async (output) => {
      const result = await agentRuntime.execute({
        agentId: config.evaluatorAgentId,
        input: {
          evaluationTask: "Score this output from 0.0 to 1.0 and provide feedback. Respond with JSON: { \"score\": 0.0-1.0, \"feedback\": \"...\" }",
          output,
        },
      });

      if (!result.success) {
        return { score: 0, feedback: result.error ?? "Evaluation failed" };
      }

      try {
        const text = String(result.output["text"] ?? "");
        const match = text.match(/\{[^}]*"score"\s*:\s*([\d.]+)[^}]*"feedback"\s*:\s*"([^"]*)"[^}]*\}/);
        if (match) {
          return {
            score: parseFloat(match[1]!),
            feedback: match[2]!,
          };
        }
      } catch {
        // Fall through to default
      }

      return { score: 0, feedback: "Could not parse evaluation" };
    };
  }

  /**
   * Execute a pipeline and update run state.
   */
  async function executePipelineAsync(
    runId: string,
    orgId: string,
    definition: PipelineDefinition,
    input: Record<string, unknown>,
  ): Promise<void> {
    try {
      await runService.startRun(runId);
      await runService.addRunEvent(runId, orgId, "pipeline_started", {
        pipelineId: definition.id,
        pattern: definition.pattern,
      });

      let output: Record<string, unknown>;

      switch (definition.pattern) {
        case "chain": {
          const config = definition.config as ChainConfig;
          const steps = config.steps.map((step) => ({
            ...step,
            mapInput: step.mapInput ?? ((prev: Record<string, unknown>) => ({ ...prev, ...input })),
          }));
          const result: ChainResult = await chain(agentRuntime, steps, input);
          output = result.success ? result.output : { error: result.error, stepResults: result.stepResults };

          if (!result.success) {
            await runService.failRun(runId, result.error ?? "Chain failed");
            return;
          }
          break;
        }

        case "parallel": {
          const config = definition.config as ParallelConfig;
          const branches = config.branches.map((b) => ({
            ...b,
            input: { ...b.input, ...input },
          }));
          const result: ParallelResult = await parallel(agentRuntime, branches, {
            ...(config.concurrency != null ? { concurrency: config.concurrency } : {}),
            ...(config.retries != null ? { retries: config.retries } : {}),
          });
          output = { branches: result.branches, succeeded: result.succeeded, failed: result.failed };

          if (!result.success) {
            await runService.failRun(runId, `${result.failed} branches failed`);
            return;
          }
          break;
        }

        case "route": {
          const config = definition.config as RouteConfig;
          const classifier = buildClassifier(config);
          const result: RouteResult = await route(agentRuntime, classifier, config.routeMap, input, {
            ...(config.fallbackAgentId ? { fallbackAgentId: config.fallbackAgentId } : {}),
            ...(config.confidenceThreshold != null ? { confidenceThreshold: config.confidenceThreshold } : {}),
          });
          output = {
            classification: result.classification,
            selectedAgentId: result.selectedAgentId,
            ...result.result.output,
          };

          if (!result.success) {
            await runService.failRun(runId, result.error ?? "Route failed");
            return;
          }
          break;
        }

        case "eval-loop": {
          const config = definition.config as EvalLoopConfig;
          const evaluator = buildEvaluator(config);
          const result: EvalLoopResult = await evalLoop(agentRuntime, config.generatorAgentId, evaluator, input, {
            maxIterations: config.maxIterations,
            threshold: config.threshold,
          });
          output = {
            ...result.output,
            iterations: result.iterations,
            finalScore: result.finalScore,
          };

          if (!result.success) {
            await runService.failRun(runId, result.error ?? "Eval loop did not meet threshold");
            return;
          }
          break;
        }

        default: {
          await runService.failRun(runId, `Unknown pipeline pattern: ${definition.pattern}`);
          return;
        }
      }

      await runService.completeRun(runId, output);
      await runService.addRunEvent(runId, orgId, "pipeline_completed", {
        pipelineId: definition.id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger?.error(`Pipeline ${definition.id} failed for run ${runId}: ${errorMessage}`);
      try {
        await runService.failRun(runId, errorMessage);
      } catch {
        logger?.error(`Failed to update run ${runId} status after pipeline error`);
      }
    }
  }

  return {
    async executePipeline(
      pipelineId: string,
      input: Record<string, unknown>,
      orgId: string,
    ): Promise<Run> {
      const definition = getPipeline(pipelineId);
      if (!definition) {
        throw new Error(`Pipeline not found: ${pipelineId}`);
      }

      const run = await runService.createRun({
        orgId,
        agentId: `pipeline:${pipelineId}`,
        input,
      });

      setImmediate(() => {
        executePipelineAsync(run.id, run.orgId, definition, input).catch((error) => {
          logger?.error(`Unexpected error in pipeline execution: ${error}`);
        });
      });

      return run;
    },

    listAvailablePipelines(): PipelineDefinition[] {
      return listPipelines();
    },
  };
}
