/**
 * Agent Execution Service - Application Layer
 *
 * Orchestrates agent execution lifecycle. Owns the business logic for:
 * - Creating runs
 * - Triggering async execution
 * - Updating run state based on results
 *
 * This service is framework-agnostic and testable in isolation.
 */

import type { IAgentRuntime, AgentRunResult } from "@techtide/agents";
import type { IRunService } from "./run-service.js";
import type { Run } from "../domain/index.js";
import { AgentNotFoundError } from "../domain/index.js";

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
}

/**
 * Creates an agent execution service with injected dependencies.
 * Follows Dependency Inversion - depends on abstractions, not concretions.
 */
export function createAgentExecutionService(
  deps: AgentExecutionServiceDeps,
): IAgentExecutionService {
  const { runService, agentRuntime, agentLookup, logger } = deps;

  /**
   * Handles the result of agent execution, updating run state accordingly.
   */
  async function handleExecutionResult(
    runId: string,
    result: AgentRunResult,
  ): Promise<void> {
    try {
      if (result.success) {
        await runService.completeRun(runId, result.output);
      } else {
        await runService.failRun(runId, result.error ?? "Agent execution failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger?.error(`Failed to update run ${runId} status: ${errorMessage}`);
    }
  }

  /**
   * Executes an agent asynchronously and updates run state.
   * This is the internal async operation triggered by executeAgent.
   */
  async function executeAsync(
    runId: string,
    agentId: string,
    input: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Mark as running
      await runService.startRun(runId);

      // Execute agent
      const result = await agentRuntime.execute({
        agentId,
        input,
      });

      // Update run status based on result
      await handleExecutionResult(runId, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      try {
        await runService.failRun(runId, errorMessage);
      } catch (_updateError) {
        logger?.error(`Failed to update run ${runId} status after error: ${errorMessage}`);
      }
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
        executeAsync(run.id, agentId, input).catch((error) => {
          logger?.error(`Unexpected error in async execution: ${error}`);
        });
      });

      return run;
    },
  };
}
