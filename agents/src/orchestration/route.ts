/**
 * Route Orchestration Primitive (Pattern #3)
 *
 * Classifies input via a Classifier function, maps the classification
 * to an agent via RouteMap, and executes the selected agent.
 */

import type { IAgentRuntime } from "../runtime/types.js";
import type { Classifier, RouteMap, RouteOptions, RouteResult } from "./types.js";

export async function route(
  runtime: IAgentRuntime,
  classifier: Classifier,
  routeMap: RouteMap,
  input: Record<string, unknown>,
  options?: RouteOptions,
): Promise<RouteResult> {
  const threshold = options?.confidenceThreshold ?? 0;

  if (options?.signal?.aborted) {
    return {
      success: false,
      classification: { category: "", confidence: 0 },
      selectedAgentId: "",
      result: { success: false, output: {}, events: [], error: "Aborted" },
      durationMs: 0,
      error: "Route aborted",
    };
  }

  const start = Date.now();

  const span = options?.tracer?.startSpan("route.classify", {});

  let classification;
  try {
    classification = await classifier(input);
  } catch (error) {
    const durationMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : "Classification failed";

    if (span) {
      options!.tracer!.endSpan(span, "error");
    }

    return {
      success: false,
      classification: { category: "", confidence: 0 },
      selectedAgentId: "",
      result: { success: false, output: {}, events: [], error: errorMessage },
      durationMs,
      error: errorMessage,
    };
  }

  if (span) {
    options!.tracer!.endSpan(span, "ok");
  }

  // Determine agent: check confidence, look up route, fall back
  let selectedAgentId: string | undefined;

  if (classification.confidence >= threshold) {
    selectedAgentId = routeMap[classification.category];
  }

  if (!selectedAgentId) {
    selectedAgentId = options?.fallbackAgentId;
  }

  if (!selectedAgentId) {
    const durationMs = Date.now() - start;
    return {
      success: false,
      classification,
      selectedAgentId: "",
      result: { success: false, output: {}, events: [], error: "No route matched" },
      durationMs,
      error: `No route for category "${classification.category}" (confidence: ${classification.confidence}) and no fallback configured`,
    };
  }

  // Execute the selected agent
  const execSpan = options?.tracer?.startSpan("route.execute", {
    agentId: selectedAgentId,
    category: classification.category,
  });

  try {
    const result = await runtime.execute({
      agentId: selectedAgentId,
      input,
      ...(options?.signal ? { signal: options.signal } : {}),
    });

    const durationMs = Date.now() - start;

    if (execSpan) {
      options!.tracer!.endSpan(execSpan, result.success ? "ok" : "error");
    }

    return {
      success: result.success,
      classification,
      selectedAgentId,
      result,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : "Execution failed";

    if (execSpan) {
      options!.tracer!.endSpan(execSpan, "error");
    }

    return {
      success: false,
      classification,
      selectedAgentId,
      result: { success: false, output: {}, events: [], error: errorMessage },
      durationMs,
      error: errorMessage,
    };
  }
}
