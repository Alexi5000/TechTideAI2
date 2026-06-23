# ADR 0007, Skills vs. tools

- **Status:** Accepted
- **Date:** 2026-06-23
- **Deciders:** TechTideAI platform team
- **Supersedes:** none

## Context

Most agent harnesses conflate two distinct concepts: **tools** (which execute a function and return a result) and **skills** (which augment the agent's internal reasoning). The PDF on FDE-aligned harness engineering flags this as a real distinction, skills "prepare an agent to solve a broader class of problems, effectively augmenting its internal reasoning capabilities," while tools "execute specific functions and return results."

Our pre-Phase-8 surface had only tools. The Mastra runtime registered `systemStatusTool`, `llmRouterTool`, `knowledgeBaseTool`, and `workflowRunnerTool`. There was no notion of "augment the agent's reasoning with a pattern." Skills were a missing layer.

## Decision

We separate the two surfaces:

- **Tools** (`agents/src/mastra/tools/`) execute a function. They have a `createTool({ id, description, inputSchema, outputSchema, execute })` shape, return values, and may have side effects (e.g. `workflow-runner` can route through the approval gate).
- **Skills** (`agents/src/skills/`) augment the agent's system prompt. They have a `systemPromptSection(agent: AgentDefinition): string | string[]` shape and return markdown to be appended to the agent's `instructions`.

Three skills ship by default:
- `prompt-iteration` (applies to `ceo` + `orchestrator`): teaches the agent how to author and refine prompts against the local eval fixtures.
- `tool-evaluator` (all tiers): teaches the agent to critique every tool result instead of chaining calls blindly.
- `contract-aware` (all tiers): teaches the agent to validate its `AgentRunResult` before returning.

Skills are wired into `agents/src/mastra/agents.ts` so the shared `instructions` builder appends the skill sections. Tools stay as they are; skills are *additional* context, not replacements.

The skill surface is OCP-friendly: `SkillRegistry` is a `ScorerRegistry`-shaped class with `register` / `resolveFor` / `extend`. New skills register and they appear automatically. The three built-ins are documented in `agents/src/skills/`.

## Decision tree: when to add a tool vs. a skill

Add a **tool** when:
- The agent needs to *do* something in the world (read a file, hit an API, take a system action).
- The result is data the agent then reasons about.
- Side effects are acceptable.

Add a **skill** when:
- The agent needs to *reason differently* about something it already has.
- The result is markdown the agent reads once.
- Side effects are not appropriate.

Concretely:
- "Look up a customer record" → tool.
- "Validate your output against the IAgentRunResult contract before returning" → skill.
- "Send an email" → tool (with the approval gate).
- "When the user asks you to author a prompt, do not improvise" → skill.

## Consequences

Positive:

- Tools and skills can evolve independently. A new tool doesn't require re-architecting the system-prompt builder; a new skill doesn't require a new tool.
- Skill sections are visible in the agent's instructions, easy to inspect, easy to test.
- The OCP-friendly registry means a contributor can add a skill without touching the harness.

Negative:

- One more file system surface. A reader who knows tools has to learn the parallel concept.
- Skills are baked into the prompt at boot. Dynamic skills (loaded per-task) are a future extension.

## Alternatives considered

- **Just merge them.** Rejected: a "tool" that doesn't return data but only augments reasoning is awkward. The distinction is real; the codebase should reflect it.
- **Use a vendor concept like "plugins."** Rejected: a "plugin" usually implies a runtime hook, not a static prompt section. Skills are a more honest name for what we ship.
