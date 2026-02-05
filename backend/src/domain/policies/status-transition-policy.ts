/**
 * Status Transition Policy - Domain Rule
 *
 * Encapsulates the business rules for valid run status transitions.
 * Follows Open/Closed Principle: extend via configuration, not modification.
 */

import type { RunStatus } from "../entities/run.js";

export interface StatusTransitionRule {
  from: RunStatus;
  to: RunStatus[];
}

/**
 * Default transition rules. Can be extended by creating a new policy
 * instance with additional rules (OCP compliance).
 */
const DEFAULT_TRANSITIONS: StatusTransitionRule[] = [
  { from: "queued", to: ["running", "canceled"] },
  { from: "running", to: ["succeeded", "failed", "canceled"] },
  { from: "succeeded", to: [] },
  { from: "failed", to: [] },
  { from: "canceled", to: [] },
];

export class StatusTransitionPolicy {
  private readonly transitions: Map<RunStatus, RunStatus[]>;

  constructor(rules: StatusTransitionRule[] = DEFAULT_TRANSITIONS) {
    this.transitions = new Map();
    for (const rule of rules) {
      this.transitions.set(rule.from, [...rule.to]);
    }
  }

  canTransition(from: RunStatus, to: RunStatus): boolean {
    const allowedTargets = this.transitions.get(from);
    return allowedTargets?.includes(to) ?? false;
  }

  getAllowedTransitions(from: RunStatus): readonly RunStatus[] {
    return this.transitions.get(from) ?? [];
  }

  /**
   * Creates a new policy with additional rules (OCP: extension without modification)
   */
  extend(additionalRules: StatusTransitionRule[]): StatusTransitionPolicy {
    const existingRules = [...DEFAULT_TRANSITIONS];
    for (const rule of additionalRules) {
      const existing = existingRules.find((r) => r.from === rule.from);
      if (existing) {
        existing.to = [...new Set([...existing.to, ...rule.to])];
      } else {
        existingRules.push({ ...rule });
      }
    }
    return new StatusTransitionPolicy(existingRules);
  }
}

/** Singleton default instance for common use */
export const defaultStatusTransitionPolicy = new StatusTransitionPolicy();
