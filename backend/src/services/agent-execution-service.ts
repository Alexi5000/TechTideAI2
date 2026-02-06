/**
 * Agent Execution Service - Application Layer
 *
 * Orchestrates agent execution lifecycle. Owns the business logic for:
 * - Creating runs
 * - Triggering async execution
 * - Updating run state based on results
 * - Retry logic for resilience
 * - Cancellation support
 *
 * This service is framework-agnostic and testable in isolation.
 */

import type { IAgentRuntime, AgentRunResult } from "@techtide/agents";
import type { IRunService } from "./run-service.js";
import type { Run } from "../domain/index.js";
import { AgentNotFoundError, InvalidStatusTransitionError } from "../domain/index.js";

/**
 * Retry configuration for status updates
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
};

/**
 * Simple delay helper for retry backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * In-memory cancellation registry for tracking running executions.
 * For production at scale, consider Redis or similar.
 */
const cancellationRegistry = new Map<string, AbortController>();

/**
 * Request cancellation of a running execution.
 * Returns true if the run was found and signalled, false otherwise.
 */
export function requestCancellation(runId: string): boolean {
  const controller = cancellationRegistry.get(runId);
  if (controller) {
    controller.abort();
    cancellationRegistry.delete(runId);
    return true;
  }
  return false;
}

/**
 * Agent lookup abstraction - allows mocking in tests
 */
export interface AgentLookup {
  exists(agentId: string): boolean;
}

/**
 * Logger interface for execution events
 */
export interface ExecutionLogger {
  error(message: string): void;
  info(message: string): void;
}

/**
 * Agent Execution Service Interface
 */
export interface IAgentExecutionService {
  /**
   * Execute an agent asynchronously. Returns the created run immediately.
   * The run will be updated as execution progresses.
   */
  executeAgent(
    agentId: string,
    input: Record<string, unknown>,
    orgId: string,
  ): Promise<Run>;
}

/**
 * Dependencies for the agent execution service
 */
export interface AgentExecutionServiceDeps {
  runService: IRunService;
  agentRuntime: IAgentRuntime;
  agentLookup: AgentLookup;
  logger?: ExecutionLogger;
  retryConfig?: RetryConfig;
}

/**
 * Creates an agent execution service with injected dependencies.
 * Follows Dependency Inversion - depends on abstractions, not concretions.
 */
export function createAgentExecutionService(
  deps: AgentExecutionServiceDeps,
): IAgentExecutionService {
  const {
    runService,
    agentRuntime,
    agentLookup,
    logger,
    retryConfig = DEFAULT_RETRY_CONFIG,
  } = deps;

  /**
   * Handles the result of agent execution with retry logic.
   * Retries with exponential backoff to handle transient persistence failures.
   */
  async function handleExecutionResultWithRetry(
    runId: string,
    result: AgentRunResult,
  ): Promise<void> {
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        if (result.success) {
          await runService.completeRun(runId, result.output);
        } else {
          await runService.failRun(runId, result.error ?? "Agent execution failed");
        }
        return; // Success - exit retry loop
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger?.error(
          `Failed to update run ${runId} status (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}): ${errorMessage}`,
        );

        if (attempt < retryConfig.maxRetries) {
          const delayMs = retryConfig.baseDelayMs * Math.pow(2, attempt);
          await delay(delayMs);
        }
      }
    }
    // All retries exhausted - log critical failure
    logger?.error(
      `CRITICAL: Failed to update run ${runId} after ${retryConfig.maxRetries + 1} attempts. Run may be stuck.`,
    );
  }

  /**
   * Executes an agent asynchronously and updates run state.
   * Supports cancellation via abort signal.
   */
  async function recordEvent(
    runId: string,
    orgId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    try {
      await runService.addRunEvent(runId, orgId, eventType, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger?.error(`Failed to record run event ${eventType} for ${runId}: ${message}`);
    }
  }

  async function markCanceled(runId: string, orgId: string, reason: string) {
    try {
      await runService.cancelRun(runId);
      await recordEvent(runId, orgId, "execution_canceled", { reason });
    } catch (error) {
      if (error instanceof InvalidStatusTransitionError) {
        return;
      }
      throw error;
    }
  }

  async function executeAsync(
    runId: string,
    agentId: string,
    orgId: string,
    input: Record<string, unknown>,
  ): Promise<void> {
    const abortController = new AbortController();
    cancellationRegistry.set(runId, abortController);
    const startTime = Date.now();

    try {
      // Check if already cancelled before starting
      if (abortController.signal.aborted) {
        await markCanceled(runId, orgId, "pre_start_abort");
        return;
      }

      // Mark as running
      await runService.startRun(runId);
      await recordEvent(runId, orgId, "execution_started", {
        agentId,
        input,
        startedAt: new Date().toISOString(),
      });

      // Check again before expensive operation
      if (abortController.signal.aborted) {
        await markCanceled(runId, orgId, "pre_execution_abort");
        return;
      }

      // Execute agent
      const result = await agentRuntime.execute({
        agentId,
        input,
        signal: abortController.signal,
      });

      // Don't update if cancelled during execution
      if (abortController.signal.aborted) {
        await markCanceled(runId, orgId, "execution_abort");
        return;
      }

      // Update run status based on result (with retry)
      await handleExecutionResultWithRetry(runId, result);

      for (const event of result.events) {
        await recordEvent(runId, orgId, event.type, {
          ...event.payload,
          eventTimestamp: event.timestamp,
        });
      }

      if (result.success) {
        await recordEvent(runId, orgId, "execution_completed", {
          durationMs: Date.now() - startTime,
        });
      } else {
        await recordEvent(runId, orgId, "execution_failed", {
          error: result.error ?? "Agent execution failed",
          durationMs: Date.now() - startTime,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      try {
        await runService.failRun(runId, errorMessage);
        await recordEvent(runId, orgId, "execution_failed", {
          error: errorMessage,
          durationMs: Date.now() - startTime,
        });
      } catch (_updateError) {
        logger?.error(`Failed to update run ${runId} status after error: ${errorMessage}`);
      }
    } finally {
      cancellationRegistry.delete(runId);
    }
  }

  return {
    async executeAgent(
      agentId: string,
      input: Record<string, unknown>,
      orgId: string,
    ): Promise<Run> {
      // Validate agent exists (fail fast)
      if (!agentLookup.exists(agentId)) {
        throw new AgentNotFoundError(agentId);
      }

      // Create run record
      const run = await runService.createRun({
        orgId,
        agentId,
        input,
      });

      // Trigger async execution (fire and forget)
      setImmediate(() => {
        executeAsync(run.id, agentId, run.orgId, input).catch((error) => {
          logger?.error(`Unexpected error in async execution: ${error}`);
        });
      });

      return run;
    },
  };
}
