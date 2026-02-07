/**
 * Mastra Runtime Implementation
 *
 * Infrastructure layer: implements IAgentRuntime using Mastra framework.
 * Wraps Mastra agents with error handling, structured output, and optional tracing.
 */

import type {
  IAgentRuntime,
  AgentRunRequest,
  AgentRunResult,
  AgentEvent,
} from "./types.js";
import type { ITracer } from "../monitoring/types.js";
import { mastraAgents } from "../mastra/agents.js";

const EXECUTION_TIMEOUT_MS = 30_000; // 30 second timeout

export interface MastraRuntimeOptions {
  tracer?: ITracer | undefined;
}

/**
 * Creates a Mastra-based agent runtime.
 *
 * The runtime wraps Mastra agents with:
 * - Structured input/output handling
 * - Timeout protection
 * - Error capture and reporting
 * - Event tracking
 * - Optional execution tracing
 */
export function createMastraRuntime(options: MastraRuntimeOptions = {}): IAgentRuntime {
  const { tracer } = options;

  return {
    async execute(request: AgentRunRequest): Promise<AgentRunResult> {
      const events: AgentEvent[] = [];
      const startTime = new Date();
      const span = tracer?.startSpan("agent.execute", { agentId: request.agentId });

      if (request.signal?.aborted) {
        const errorMessage = "Agent execution aborted before start";
        events.push({
          type: "error",
          timestamp: startTime.toISOString(),
          payload: { error: errorMessage },
        });
        if (span) tracer?.endSpan(span, "error");
        return {
          success: false,
          output: {},
          events,
          error: errorMessage,
        };
      }

      // Validate agent exists
      const agent = mastraAgents[request.agentId];
      if (!agent) {
        if (span) tracer?.endSpan(span, "error");
        return {
          success: false,
          output: {},
          events: [],
          error: `Agent not found: ${request.agentId}`,
        };
      }

      events.push({
        type: "message",
        timestamp: startTime.toISOString(),
        payload: {
          event: "execution_started",
          agentId: request.agentId,
          input: request.input,
        },
      });

      try {
        // Convert input to message format expected by Mastra
        const prompt =
          typeof request.input["prompt"] === "string"
            ? request.input["prompt"]
            : JSON.stringify(request.input);

        if (request.signal?.aborted) {
          throw new Error("Agent execution aborted");
        }

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Agent execution timed out after ${EXECUTION_TIMEOUT_MS}ms`));
          }, EXECUTION_TIMEOUT_MS);
        });

        // Execute agent with timeout
        const executionPromise = agent.generate([
          {
            role: "user",
            content: prompt,
          },
        ]);

        const result = await Promise.race([executionPromise, timeoutPromise]);

        if (request.signal?.aborted) {
          throw new Error("Agent execution aborted");
        }

        // Extract text from result
        const outputText = result.text ?? "";
        const toolResults = result.toolResults ?? [];

        // Record tool events
        for (const toolResult of toolResults) {
          if (span) {
            tracer?.addEvent(span, {
              name: "tool_result",
              timestamp: Date.now(),
              attributes: {
                toolName: toolResult.payload.toolName,
              },
            });
          }
          events.push({
            type: "tool_result",
            timestamp: new Date().toISOString(),
            payload: {
              toolName: toolResult.payload.toolName,
              result: toolResult.payload.result,
            },
          });
        }

        events.push({
          type: "message",
          timestamp: new Date().toISOString(),
          payload: {
            event: "execution_completed",
            durationMs: Date.now() - startTime.getTime(),
          },
        });

        if (span) tracer?.endSpan(span, "ok");

        return {
          success: true,
          output: {
            text: outputText,
            toolResults,
          },
          events,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown execution error";

        events.push({
          type: "error",
          timestamp: new Date().toISOString(),
          payload: {
            error: errorMessage,
            durationMs: Date.now() - startTime.getTime(),
          },
        });

        if (span) tracer?.endSpan(span, "error");

        return {
          success: false,
          output: {},
          events,
          error: errorMessage,
        };
      }
    },
  };
}
