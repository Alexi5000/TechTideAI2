/**
 * RunEvent entity — extended for the evidence plane (Phase 2.1).
 *
 * The original `RunEvent` defined alongside `Run` was structurally identical
 * to what we want here, but the v2 model adds `correlation_id`, `severity`,
 * and `occurred_at`. Keeping the new shape here so v0.1 events still
 * deserialize.
 */

import { z } from "zod";

export const RunEventSeveritySchema = z.enum([
  "debug",
  "info",
  "warn",
  "error",
  "critical",
]);
export type RunEventSeverity = z.infer<typeof RunEventSeveritySchema>;

/**
 * Canonical event-type taxonomy. Stable strings are easier to query
 * and to build dashboards on than freeform strings.
 */
export const RunEventTypeSchema = z.enum([
  "run.created",
  "run.started",
  "run.completed",
  "run.failed",
  "run.canceled",
  "run.awaiting-approval",
  "run.approved",
  "run.denied",
  "agent.tool_call",
  "agent.tool_result",
  "agent.message",
  "agent.error",
  "approval.requested",
  "approval.granted",
  "approval.denied",
  "approval.expired",
  "trace.span",
]);
export type RunEventType = z.infer<typeof RunEventTypeSchema>;

export const RunEventV2Schema = z
  .object({
    id: z.string(),
    runId: z.string(),
    orgId: z.string(),
    eventType: RunEventTypeSchema,
    severity: RunEventSeveritySchema.default("info"),
    correlationId: z.string().nullable().default(null),
    payload: z.record(z.string(), z.unknown()).default({}),
    occurredAt: z.string(),
  })
  .strict();

export type RunEventV2 = z.infer<typeof RunEventV2Schema>;

export function parseRunEventV2(input: unknown): RunEventV2 {
  return RunEventV2Schema.parse(input);
}
