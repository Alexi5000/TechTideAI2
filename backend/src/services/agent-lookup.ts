/**
 * Agent Lookup Adapter
 *
 * Adapts the agent registry to the AgentLookup interface.
 * Keeps infrastructure coupling out of the execution service.
 */

import { getAgentById } from "@techtide/agents";
import type { AgentLookup } from "./agent-execution-service.js";

/**
 * Creates an agent lookup using the agent registry.
 */
export function createAgentLookup(): AgentLookup {
  return {
    exists(agentId: string): boolean {
      return getAgentById(agentId) !== undefined;
    },
  };
}
