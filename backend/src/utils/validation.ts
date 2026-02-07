/**
 * Validation Utilities
 *
 * Provides type-safe Zod parsing with proper error handling
 * that maps to HTTP 400 Bad Request responses.
 */

import { z, ZodError } from "zod";
import type { FastifyReply } from "fastify";

/**
 * Custom validation error that wraps Zod issues.
 * Used to distinguish validation failures from other errors.
 */
export class ValidationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super("Validation failed");
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Safely parse data with a Zod schema, throwing ValidationError on failure.
 * Use this instead of schema.parse() for proper error handling.
 *
 * @example
 * const query = safeParse(querySchema, request.query);
 */
export function safeParse<T extends z.ZodType>(
  schema: T,
  data: unknown,
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }
  return result.data;
}

/**
 * Handle validation errors by returning 400 Bad Request with details.
 * Returns the reply if handled, null if the error wasn't a validation error.
 *
 * @example
 * try {
 *   const data = safeParse(schema, body);
 * } catch (error) {
 *   const handled = handleValidationError(error, reply);
 *   if (handled) return handled;
 *   throw error;
 * }
 */
export function handleValidationError(
  error: unknown,
  reply: FastifyReply,
): FastifyReply | null {
  if (error instanceof ValidationError || error instanceof ZodError) {
    const issues =
      error instanceof ValidationError ? error.issues : error.issues;
    return reply.status(400).send({
      error: "Bad Request",
      message: "Validation failed",
      details: issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    });
  }
  return null;
}
