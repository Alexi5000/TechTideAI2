/**
 * Skill: contract-aware.
 *
 * Before returning, the agent validates its output against the
 * `IAgentRunResult` contract. Catches common mistakes:
 *   - emitting an event with a `type` not in the union,
 *   - returning a `success: true` with an empty `events` array when tool calls happened,
 *   - returning an `output` whose shape doesn't match what the task expected.
 * Applies to all tiers.
 */

import type { Skill } from "./interfaces.js";
import type { AgentDefinition } from "../core/types.js";

export const contractAwareSkill: Skill = {
  id: "contract-aware",
  name: "Contract-Aware Output",
  description:
    "Before returning, validate your output against the IAgentRunResult contract. Catches shape mismatches before they leak into the eval harness or the audit log.",
  version: "1.0.0",
  systemPromptSection(_agent: AgentDefinition): string {
    return [
      "## Contract-Aware Output",
      "",
      "Your return value is an `AgentRunResult`:",
      "",
      "```",
      "{",
      "  success: boolean,",
      "  output: Record<string, unknown>,",
      "  events: AgentEvent[],",
      "  error?: string,",
      "  approvalId?: string",
      "}",
      "```",
      "",
      "Each `AgentEvent` has `type ∈ { tool_call, tool_result, message, error, approval_requested, approval_granted, approval_denied }` and `payload: Record<string, unknown>`.",
      "",
      "Before returning, verify:",
      "1. `success` reflects reality. If anything in your chain threw, set `success: false` and put the error in `error`.",
      "2. If you called tools, the corresponding `tool_call` and `tool_result` events are in `events`. Empty `events` for a run that did real work is a bug.",
      "3. If you paused for an approval, the `approvalId` is set and an `approval_requested` event is present.",
      "4. `output` matches the shape the calling context expected. The eval harness validates this against the fixture's `expected` schema; an empty or partial output will fail the task.",
      "",
      "Reference: `agents/src/runtime/types.ts`, `contracts/schema.json`.",
    ].join("\n");
  },
};
