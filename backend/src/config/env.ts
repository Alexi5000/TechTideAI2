import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const optionalUrl = optionalString.pipe(z.string().url().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DEFAULT_LLM_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
  OPENAI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
});

export const env = envSchema.parse(process.env);
