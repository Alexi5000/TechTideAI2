/**
 * JSON-schema scorer.
 *
 * Validates that the agent output is an object conforming to the JSON schema in
 * `expected.jsonSchema`. We hand-roll a minimal subset of the JSON Schema spec
 * (object type, required keys, primitive type per property, enum, pattern) to
 * avoid pulling in ajv. This covers every fixture in `evals/fixtures/`.
 */

import type { ScorerContext, ScoringResult } from "./interfaces.js";
import { Scorer } from "./interfaces.js";

interface JsonSchema {
  type?: "object" | "array" | "string" | "number" | "boolean";
  required?: string[];
  properties?: Record<string, JsonSchema>;
  enum?: unknown[];
  pattern?: string;
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
}

export class JsonSchemaScorer implements Scorer {
  readonly kind = "json-schema" as const;

  async score({ expected, agentOutput }: ScorerContext): Promise<ScoringResult> {
    const start = Date.now();
    if (!expected.jsonSchema) {
      return {
        score: 1,
        passed: true,
        rationale: "no expected.jsonSchema provided; scorer is a no-op",
        durationMs: Date.now() - start,
      };
    }

    const errors = validate(expected.jsonSchema as JsonSchema, agentOutput);
    if (errors.length === 0) {
      return {
        score: 1,
        passed: true,
        rationale: "schema validation passed",
        durationMs: Date.now() - start,
      };
    }

    return {
      score: 0,
      passed: false,
      rationale: `schema violations: ${errors.join("; ")}`,
      durationMs: Date.now() - start,
    };
  }
}

function validate(schema: JsonSchema, value: unknown, path = "$"): string[] {
  const errors: string[] = [];

  if (schema.enum) {
    if (!schema.enum.some((candidate) => deepEqual(candidate, value))) {
      errors.push(`${path}: value not in enum`);
    }
  }

  if (schema.type) {
    if (!typeMatches(schema.type, value)) {
      errors.push(`${path}: expected ${schema.type}, got ${describeType(value)}`);
      return errors;
    }
  }

  if (schema.type === "object" && typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    for (const required of schema.required ?? []) {
      if (!(required in obj)) {
        errors.push(`${path}.${required}: required`);
      }
    }
    for (const [key, subSchema] of Object.entries(schema.properties ?? {})) {
      if (key in obj) {
        errors.push(...validate(subSchema, obj[key], `${path}.${key}`));
      }
    }
  }

  if (schema.type === "array" && Array.isArray(value)) {
    const itemSchema = schema.items;
    if (itemSchema) {
      value.forEach((item, idx) => {
        errors.push(...validate(itemSchema, item, `${path}[${idx}]`));
      });
    }
  }

  if (schema.type === "string" && typeof value === "string") {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: does not match pattern ${schema.pattern}`);
    }
  }

  if (schema.type === "number" && typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: ${value} < minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: ${value} > maximum ${schema.maximum}`);
    }
  }

  return errors;
}

function typeMatches(type: string, value: unknown): boolean {
  switch (type) {
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    default:
      return false;
  }
}

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}
