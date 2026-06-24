/**
 * LLM-as-judge scorer.
 *
 * Asks a separate LLM (default: same provider as the agent, temperature=0) to
 * grade the agent's output on a 0..1 scale. The judge prompt is versioned via
 * `JUDGE_PROMPT_VERSION` and lives in this file as the single source of truth.
 *
 * IMPORTANT: judge output is Zod-validated. Anything that doesn't parse returns
 * `passed: false, score: 0` and surfaces the parse error in `rationale` so we
 * never silently inflate scores.
 */

import { z } from "zod";

import { generateText } from "../llm.js";
import type { LlmProvider } from "@techtide/apis";
import type { ScorerContext, ScoringResult } from "./interfaces.js";
import type { Scorer } from "./interfaces.js";
import { env } from "../../config/env.js";

export const JUDGE_PROMPT_VERSION = "judge-v1";
export const JUDGE_MODEL_DEFAULT = "gpt-4o";

const JudgeOutputSchema = z.object({
  score: z.number().min(0).max(1),
  passed: z.boolean(),
  rationale: z.string().min(1),
});
export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;

const systemPrompt = [
  "You are an impartial judge grading an AI agent's output against a task and a rubric.",
  "Return a JSON object with keys:",
  "  score: a number from 0 (completely wrong) to 1 (perfect).",
  "  passed: true if score >= 0.7, else false.",
  "  rationale: a one-paragraph explanation citing specific evidence.",
  "Do not include any text outside the JSON object.",
].join("\n");

export interface LlmJudgeOptions {
  provider?: LlmProvider;
  model?: string;
  passThreshold?: number;
}

export class LlmJudgeScorer implements Scorer {
  readonly kind = "llm-judge" as const;

  constructor(private readonly options: LlmJudgeOptions = {}) {}

  async score(ctx: ScorerContext): Promise<ScoringResult> {
    const start = Date.now();
    const provider = this.options.provider ?? env.DEFAULT_LLM_PROVIDER;
    const model = ctx.judgeModel ?? this.options.model ?? JUDGE_MODEL_DEFAULT;
    const threshold = this.options.passThreshold ?? 0.7;

    if (!hasApiKey(provider)) {
      return {
        score: 0,
        passed: false,
        rationale: `judge unavailable: ${provider} API key not set`,
        durationMs: Date.now() - start,
      };
    }

    const userPrompt = buildJudgePrompt(ctx);
    let response;
    try {
      response = await generateText({
        provider,
        model,
        input: userPrompt,
        system: systemPrompt,
        temperature: 0,
        maxTokens: 500,
      });
    } catch (err) {
      return {
        score: 0,
        passed: false,
        rationale: `judge call failed: ${(err as Error).message}`,
        durationMs: Date.now() - start,
      };
    }

    const parsed = safeParseJudgeJson(response.text);
    if (!parsed) {
      return {
        score: 0,
        passed: false,
        rationale: `judge output did not parse as JudgeOutput schema: ${truncate(response.text)}`,
        durationMs: Date.now() - start,
      };
    }

    return {
      score: parsed.score,
      passed: parsed.passed && parsed.score >= threshold,
      rationale: parsed.rationale,
      durationMs: Date.now() - start,
    };
  }
}

function hasApiKey(provider: LlmProvider): boolean {
  if (provider === "openai") return Boolean(env.OPENAI_API_KEY);
  return Boolean(env.ANTHROPIC_API_KEY);
}

function buildJudgePrompt(ctx: ScorerContext): string {
  return [
    `TASK: ${ctx.task.id} (agent ${ctx.task.agentId}, category ${ctx.task.category}, difficulty ${ctx.task.difficulty})`,
    "",
    "INPUT:",
    safeStringifyForPrompt(ctx.task.input),
    "",
    "AGENT OUTPUT:",
    safeStringifyForPrompt(ctx.agentOutput),
    "",
    "EXPECTED:",
    safeStringifyForPrompt(ctx.expected),
    "",
    "RUBRIC:",
    ctx.task.rubric,
  ].join("\n");
}

function safeStringifyForPrompt(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => (v === undefined ? null : v), 2);
  } catch {
    return String(value);
  }
}

function safeParseJudgeJson(text: string): JudgeOutput | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const obj = JSON.parse(cleaned);
    return JudgeOutputSchema.parse(obj);
  } catch {
    return null;
  }
}

function truncate(s: string, max = 200): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
