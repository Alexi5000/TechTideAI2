/**
 * Rubric-weighted scorer.
 *
 * Reads `expected.assertions` (an array of concrete claims) and uses an LLM judge
 * to mark each assertion as satisfied or not. The final score is the fraction of
 * satisfied assertions. `passed` is true when the score meets `passThreshold`.
 *
 * Used in tandem with `llm-judge` when a task is open-ended but decomposable.
 */

import { z } from "zod";

import { generateText } from "../llm.js";
import type { LlmProvider } from "@techtide/apis";
import type { ScorerContext, ScoringResult } from "./interfaces.js";
import type { Scorer } from "./interfaces.js";
import { env } from "../../config/env.js";

export interface RubricWeightedOptions {
  provider?: LlmProvider;
  model?: string;
  passThreshold?: number;
}

export const RubricJudgeSchema = z.object({
  results: z.array(
    z.object({
      assertion: z.string(),
      satisfied: z.boolean(),
      evidence: z.string().min(1),
    }),
  ),
});

export class RubricWeightedScorer implements Scorer {
  readonly kind = "rubric-weighted" as const;

  constructor(private readonly options: RubricWeightedOptions = {}) {}

  async score(ctx: ScorerContext): Promise<ScoringResult> {
    const start = Date.now();
    const provider = this.options.provider ?? env.DEFAULT_LLM_PROVIDER;
    const model = this.options.model ?? "gpt-4o";
    const threshold = this.options.passThreshold ?? 0.7;

    const assertions = ctx.expected.assertions ?? [];
    if (assertions.length === 0) {
      return {
        score: 1,
        passed: true,
        rationale: "no assertions in expected; scorer is a no-op",
        durationMs: Date.now() - start,
      };
    }

    if ((provider === "openai" && !env.OPENAI_API_KEY) ||
        (provider === "anthropic" && !env.ANTHROPIC_API_KEY)) {
      return {
        score: 0,
        passed: false,
        rationale: `rubric judge unavailable: ${provider} API key not set`,
        durationMs: Date.now() - start,
      };
    }

    const systemPrompt = [
      "You are an impartial grader. You will receive a list of assertions about an",
      "AI agent's output. For each assertion, output an object with keys:",
      "  assertion: the assertion text (verbatim)",
      "  satisfied: true or false",
      "  evidence: a short quote or paraphrase from the agent output that supports your verdict",
      "Return ONLY a JSON object: {\"results\": [...]}",
    ].join("\n");

    const userPrompt = [
      "AGENT OUTPUT:",
      safeStringifyForPrompt(ctx.agentOutput),
      "",
      "ASSERTIONS:",
      ...assertions.map((a, i) => `${i + 1}. ${a}`),
    ].join("\n");

    let response;
    try {
      response = await generateText({
        provider,
        model,
        input: userPrompt,
        system: systemPrompt,
        temperature: 0,
        maxTokens: 1500,
      });
    } catch (err) {
      return {
        score: 0,
        passed: false,
        rationale: `rubric judge failed: ${(err as Error).message}`,
        durationMs: Date.now() - start,
      };
    }

    const parsed = safeParseRubricJson(response.text);
    if (!parsed) {
      return {
        score: 0,
        passed: false,
        rationale: `rubric judge output did not parse: ${truncate(response.text)}`,
        durationMs: Date.now() - start,
      };
    }

    const satisfied = parsed.results.filter((r) => r.satisfied).length;
    const score = satisfied / assertions.length;
    const evidence = parsed.results
      .map((r) => `${r.satisfied ? "✓" : "✗"} ${r.assertion}, ${r.evidence}`)
      .join("\n");

    return {
      score,
      passed: score >= threshold,
      rationale: `${satisfied}/${assertions.length} assertions satisfied\n${evidence}`,
      durationMs: Date.now() - start,
    };
  }
}

function safeParseRubricJson(text: string): z.infer<typeof RubricJudgeSchema> | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return RubricJudgeSchema.parse(JSON.parse(cleaned));
  } catch {
    return null;
  }
}

function safeStringifyForPrompt(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => (v === undefined ? null : v), 2);
  } catch {
    return String(value);
  }
}

function truncate(s: string, max = 200): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
