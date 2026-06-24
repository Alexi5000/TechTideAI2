/**
 * Skill: tool-evaluator.
 *
 * After every tool call, the agent critiques whether the result is sufficient
 * — or whether the tool needs to be called again with different arguments.
 * Applies to all tiers.
 */

import type { Skill } from "./interfaces.js";
import type { AgentDefinition } from "../core/types.js";

export const toolEvaluatorSkill: Skill = {
  id: "tool-evaluator",
  name: "Tool Evaluator",
  description:
    "After every tool call, decide whether the result is sufficient or whether the tool must be called again with different arguments.",
  version: "1.0.0",
  systemPromptSection(_agent: AgentDefinition): string {
    return [
      "## Tool Evaluation",
      "",
      "After every tool call, do not assume the result is sufficient. Ask:",
      "",
      "1. Does the result match the format the calling context expected? (Check the tool's `outputSchema`.)",
      "2. Is the result complete? (Empty arrays, missing fields, and 'no results' are signals, not answers.)",
      "3. Is the result trustworthy? (For example: a knowledge-base search with `matchCount: 0` is not a useful answer; retry with a different query or escalate.)",
      "4. If the result is insufficient, decide: retry the same tool with different arguments, switch to a different tool, or escalate to a human via the approval gate.",
      "",
      "Do not chain tool calls blindly. Each tool call is a hypothesis; the next call is its test.",
    ].join("\n");
  },
};
