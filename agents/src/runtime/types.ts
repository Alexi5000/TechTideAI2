/**
 * Agent Runtime Types - Domain Contract
 *
 * Defines the interface for agent execution. Implementations may use
 * Mastra, LangGraph, or other orchestration frameworks.
 */

export interface AgentRunRequest {
  agentId: string;
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
  sessionId?: string;
  signal?: AbortSignal;
}

export interface AgentEvent {
  type: "tool_call" | "tool_result" | "message" | "error";
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface AgentRunResult {
  success: boolean;
  output: Record<string, unknown>;
  events: AgentEvent[];
  error?: string;
}

/**
 * Agent Runtime Interface
 *
 * Abstracts agent execution from specific frameworks. Allows swapping
 * Mastra for LangGraph or other orchestrators without changing consumers.
 */
export interface IAgentRuntime {
  /**
   * Execute an agent with the given input.
   * Returns a structured result with output and execution events.
   *
   * @param request - Agent ID and input parameters
   * @returns Promise resolving to execution result
   */
  execute(request: AgentRunRequest): Promise<AgentRunResult>;
}
