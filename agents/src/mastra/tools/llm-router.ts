/**
 * LLM Router Tool
 *
 * Routes text generation requests to OpenAI or Anthropic with policy enforcement.
 * Agents use this tool to delegate LLM calls to the appropriate provider.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  createOpenAIClient,
  generateOpenAIText,
  createAnthropicClient,
  generateAnthropicText,
} from "@techtide/apis";

const DEFAULT_PROVIDER = process.env.DEFAULT_LLM_PROVIDER ?? "openai";
const DEFAULT_MODEL_OPENAI = "gpt-4o";
const DEFAULT_MODEL_ANTHROPIC = "claude-3-5-sonnet-20241022";

export const llmRouterTool = createTool({
  id: "llm-router",
  description:
    "Route LLM generation requests to OpenAI or Anthropic with policy enforcement and cost controls.",

  inputSchema: z.object({
    input: z.string().describe("The prompt or input text to send to the LLM"),
    provider: z
      .enum(["openai", "anthropic"])
      .default(DEFAULT_PROVIDER as "openai" | "anthropic")
      .describe("Which LLM provider to use"),
    model: z
      .string()
      .optional()
      .describe("Specific model to use (defaults based on provider)"),
    system: z
      .string()
      .optional()
      .describe("System prompt to set context for the LLM"),
    temperature: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .describe("Sampling temperature (0-2)"),
    maxTokens: z
      .number()
      .int()
      .min(1)
      .max(8192)
      .optional()
      .describe("Maximum tokens in the response"),
  }),

  outputSchema: z.object({
    provider: z.string(),
    model: z.string(),
    text: z.string(),
    usage: z
      .object({
        inputTokens: z.number().optional(),
        outputTokens: z.number().optional(),
      })
      .optional(),
  }),

  execute: async (params) => {
    const {
      input,
      provider,
      model,
      system,
      temperature,
      maxTokens,
    } = params;

    // Resolve model with defaults
    const resolvedModel =
      model ??
      (provider === "anthropic" ? DEFAULT_MODEL_ANTHROPIC : DEFAULT_MODEL_OPENAI);

    try {
      if (provider === "anthropic") {
        const client = createAnthropicClient();
        const response = await generateAnthropicText(
          {
            model: resolvedModel,
            input,
            system,
            temperature,
            maxTokens,
          },
          client,
        );

        return {
          provider: response.provider,
          model: response.model,
          text: response.text,
          usage: undefined, // Could extract from raw if needed
        };
      } else {
        // Default to OpenAI
        const client = createOpenAIClient();
        const response = await generateOpenAIText(
          {
            model: resolvedModel,
            input,
            system,
            temperature,
            maxTokens,
          },
          client,
        );

        return {
          provider: response.provider,
          model: response.model,
          text: response.text,
          usage: undefined, // Could extract from raw if needed
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown LLM error";
      throw new Error(`LLM Router failed: ${errorMessage}`);
    }
  },
});
