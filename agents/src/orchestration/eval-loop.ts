/**
 * Evaluator-Optimizer Orchestration Primitive (Pattern #5)
 *
 * Iteratively generates output via an agent and evaluates it via an EvalFn.
 * Loops until the score meets the threshold or max iterations is reached.
 */

import type { IAgentRuntime } from "../runtime/types.js";
import type { EvalFn, EvalLoopOptions, EvalLoopResult, EvalIteration } from "./types.js";

export async function evalLoop(
  runtime: IAgentRuntime,
  generatorAgentId: string,
  evaluator: EvalFn,
  initialInput: Record<string, unknown>,
  options: EvalLoopOptions,
): Promise<EvalLoopResult> {
  const history: EvalIteration[] = [];
  let currentInput = initialInput;
  let bestOutput: Record<string, unknown> = {};
  let bestScore = -Infinity;

  for (let i = 0; i < options.maxIterations; i++) {
    if (options.signal?.aborted) {
      return {
        success: false,
        output: bestOutput,
        iterations: history.length,
        finalScore: bestScore === -Infinity ? 0 : bestScore,
        history,
        error: "Eval loop aborted",
      };
    }

    const iterSpan = options.tracer?.startSpan(`evalLoop.iteration.${i}`, {
      agentId: generatorAgentId,
      iteration: i,
    });

    const start = Date.now();

    // Generate
    let result;
    try {
      result = await runtime.execute({
        agentId: generatorAgentId,
        input: currentInput,
        ...(options.signal ? { signal: options.signal } : {}),
      });
    } catch (error) {
      const durationMs = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : "Generator failed";

      if (iterSpan) {
        options.tracer!.endSpan(iterSpan, "error");
      }

      history.push({
        iteration: i,
        output: {},
        score: 0,
        feedback: errorMessage,
        durationMs,
      });

      return {
        success: false,
        output: bestOutput,
        iterations: history.length,
        finalScore: bestScore === -Infinity ? 0 : bestScore,
        history,
        error: errorMessage,
      };
    }

    if (!result.success) {
      const durationMs = Date.now() - start;

      if (iterSpan) {
        options.tracer!.endSpan(iterSpan, "error");
      }

      history.push({
        iteration: i,
        output: result.output,
        score: 0,
        feedback: result.error ?? "Generator returned failure",
        durationMs,
      });

      return {
        success: false,
        output: bestOutput,
        iterations: history.length,
        finalScore: bestScore === -Infinity ? 0 : bestScore,
        history,
        error: result.error ?? "Generator returned failure",
      };
    }

    // Evaluate
    const evaluation = await evaluator(result.output);
    const durationMs = Date.now() - start;

    history.push({
      iteration: i,
      output: result.output,
      score: evaluation.score,
      feedback: evaluation.feedback,
      durationMs,
    });

    if (evaluation.score > bestScore) {
      bestScore = evaluation.score;
      bestOutput = result.output;
    }

    if (iterSpan) {
      options.tracer!.endSpan(iterSpan, evaluation.score >= options.threshold ? "ok" : undefined);
    }

    // Check threshold
    if (evaluation.score >= options.threshold) {
      return {
        success: true,
        output: result.output,
        iterations: history.length,
        finalScore: evaluation.score,
        history,
      };
    }

    // Prepare next iteration with feedback
    currentInput = {
      ...initialInput,
      previousOutput: result.output,
      feedback: evaluation.feedback,
      iteration: i + 1,
    };
  }

  // Max iterations reached — return best output
  return {
    success: false,
    output: bestOutput,
    iterations: history.length,
    finalScore: bestScore,
    history,
    error: `Max iterations (${options.maxIterations}) reached. Best score: ${bestScore}`,
  };
}
