/**
 * Skill: prompt-iteration.
 *
 * Teaches the agent how to iterate its own prompts against the local eval
 * fixtures. Applies to orchestrators and the CEO (workers don't author
 * prompts; they execute scoped tasks).
 */

import type { Skill } from "./interfaces.js";
import type { AgentDefinition } from "../core/types.js";

export const promptIterationSkill: Skill = {
  id: "prompt-iteration",
  name: "Prompt Iteration",
  description:
    "When the user asks you to author or refine a prompt, ground it in the local eval fixtures and the sprint contract — not in your own intuition.",
  appliesTo: ["ceo", "orchestrator"],
  version: "1.0.0",
  systemPromptSection(_agent: AgentDefinition): string {
    return [
      "## Prompt Iteration",
      "",
      "When the user asks you to author or refine a prompt, do not improvise. Follow this loop:",
      "",
      "1. Read the relevant fixture in `evals/fixtures/golden-tasks.v1.json` (or the latest sprint contract in `evals/sprints/`). The rubric is the spec.",
      "2. Draft the prompt inline. Be explicit about format, scope, and risk tier.",
      "3. Recommend the operator run `pnpm -C backend evals --suite <suite>` before merging. Do not claim a prompt is good without a scoring run.",
      "4. If the prompt is for an agent action that touches `external` / `destructive` / `billing` risk, route it through the approval queue (`POST /api/approvals/:id/grant|deny`) before the agent can execute.",
      "",
      "Reference: `docs/EVALS.md` (scoring methodology), `docs/adr/0004-approval-as-execution-boundary.md`.",
    ].join("\n");
  },
};
