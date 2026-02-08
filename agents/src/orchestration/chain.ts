/**
 * Chain Orchestration Primitive (Pattern #1)
 *
 * Executes a sequence of agent steps where each step's output
 * becomes the next step's input. Stops on first failure or abort.
 */

import type { IAgentRuntime } from "../runtime/types.js";
import type { PipelineStep, ChainOptions, ChainResult, StepResult } from "./types.js";

export async function chain(
  runtime: IAgentRuntime,
  steps: PipelineStep[],
  initialInput: Record<string, unknown>,
  options?: ChainOptions,
): Promise<ChainResult> {
  if (steps.length === 0) {
    return { success: true, output: initialInput, stepResults: [] };
  }

  const stepResults: StepResult[] = [];
  let currentInput = initialInput;

  for (let i = 0; i < steps.length; i++) {
    if (options?.signal?.aborted) {
      return {
        success: false,
        output: currentInput,
        stepResults,
        error: "Chain aborted",
      };
    }

    const step = steps[i]!;
    const stepInput = step.mapInput ? step.mapInput(currentInput) : currentInput;

    const span = options?.tracer?.startSpan(`chain.step.${i}`, {
      agentId: step.agentId,
      stepIndex: i,
    });

    const start = Date.now();

    try {
      const result = await runtime.execute({
        agentId: step.agentId,
        input: stepInput,
        ...(options?.signal ? { signal: options.signal } : {}),
      });

      const durationMs = Date.now() - start;

      if (span) {
        options!.tracer!.endSpan(span, result.success ? "ok" : "error");
      }

      stepResults.push({ stepIndex: i, agentId: step.agentId, result, durationMs });

      if (!result.success) {
        return {
          success: false,
          output: result.output,
          stepResults,
          error: result.error ?? `Step ${i} (${step.agentId}) failed`,
        };
      }

      currentInput = result.output;
    } catch (error) {
      const durationMs = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (span) {
        options!.tracer!.endSpan(span, "error");
      }

      stepResults.push({
        stepIndex: i,
        agentId: step.agentId,
        result: { success: false, output: {}, events: [], error: errorMessage },
        durationMs,
      });

      return {
        success: false,
        output: currentInput,
        stepResults,
        error: errorMessage,
      };
    }
  }

  return {
    success: true,
    output: currentInput,
    stepResults,
  };
}
