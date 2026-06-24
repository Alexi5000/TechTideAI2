/**
 * Approval Policy, Domain Rule.
 *
 * Classifies agent actions into risk tiers and decides whether an action
 * requires human approval before it can run. OCP-extensible: add new tiers
 * via `extend()` rather than by mutating the default policy.
 *
 * This module is the canonical home of the policy and lives in
 * `@techtide/agents` to avoid a workspace dependency cycle (the agents
 * package imports the policy at build time; the backend re-exports it for
 * downstream consumers).
 */

export type ApprovalRiskTier =
  | "read"
  | "write"
  | "external"
  | "destructive"
  | "billing";

export interface ApprovalDecision {
  readonly requiresApproval: boolean;
  readonly reason: string;
  readonly riskTier: ApprovalRiskTier;
}

export interface RiskClassifier {
  classify(
    action: string,
    payload: Readonly<Record<string, unknown>>,
  ): ApprovalRiskTier;
}

/**
 * ApprovalRequest, pending human-in-the-loop decision for a high-risk
 * agent action. Defined here as a TypeScript type so the agents runtime can
 * reference the shape without depending on the backend package; the
 * backend's `entities/approval-request.ts` is the Zod-validated source.
 */
export interface ApprovalRequest {
  readonly id: string;
  readonly runId: string;
  readonly orgId: string;
  readonly agentId: string;
  readonly action: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly riskTier: ApprovalRiskTier;
  readonly status: "pending" | "granted" | "denied" | "expired";
  readonly requestedAt: string;
  readonly decidedAt: string | null;
  readonly decidedBy: string | null;
  readonly rationale: string | null;
  readonly expiresAt: string;
}

const DEFAULT_HIGH_RISK_TIERS: readonly ApprovalRiskTier[] = [
  "external",
  "destructive",
  "billing",
];

/**
 * Default classifier, heuristics. Operators can replace via constructor.
 *
 * - Anything touching `payment`, `wire`, `transfer`, `billing`, `invoice` → billing.
 * - Anything touching `delete`, `purge`, `drop`, `terminate`, `cancel_account` → destructive.
 * - Anything touching `email`, `send`, `post`, `webhook`, `external_api` → external.
 * - Anything touching `update`, `create`, `edit`, `patch`, `write` → write.
 * - Else → read.
 */
export const defaultRiskClassifier: RiskClassifier = {
  classify(action, payload) {
    const blob = `${action} ${JSON.stringify(payload ?? {})}`;
    const has = (...needles: string[]) => needles.some((n) => blob.includes(n));
    if (has("payment", "wire", "transfer", "billing", "invoice", "charge")) {
      return "billing";
    }
    if (has("delete", "purge", "drop_table", "terminate", "revoke", "wipe")) {
      return "destructive";
    }
    if (has(
      "send_email",
      "send_message",
      "post_to",
      "webhook",
      "external_api",
      "publish",
    )) {
      return "external";
    }
    if (has("update", "create", "edit", "patch", "write", "insert", "upsert")) {
      return "write";
    }
    return "read";
  },
};

export class ApprovalPolicy {
  private readonly highRiskTiers: Set<ApprovalRiskTier>;
  private readonly classifier: RiskClassifier;

  constructor(opts?: {
    highRiskTiers?: readonly ApprovalRiskTier[];
    classifier?: RiskClassifier;
  }) {
    this.highRiskTiers = new Set(opts?.highRiskTiers ?? DEFAULT_HIGH_RISK_TIERS);
    this.classifier = opts?.classifier ?? defaultRiskClassifier;
  }

  classify(
    action: string,
    payload: Readonly<Record<string, unknown>>,
  ): ApprovalRiskTier {
    return this.classifier.classify(action, payload);
  }

  decide(
    action: string,
    payload: Readonly<Record<string, unknown>>,
  ): ApprovalDecision {
    const tier = this.classify(action, payload);
    const requiresApproval = this.highRiskTiers.has(tier);
    return {
      riskTier: tier,
      requiresApproval,
      reason: requiresApproval
        ? `Action '${action}' classified as ${tier}; requires human approval`
        : `Action '${action}' classified as ${tier}; auto-approved`,
    };
  }

  /** OCP: returns a new policy with additional high-risk tiers. */
  extend(additionalTiers: readonly ApprovalRiskTier[]): ApprovalPolicy {
    return new ApprovalPolicy({
      highRiskTiers: [...this.highRiskTiers, ...additionalTiers],
      classifier: this.classifier,
    });
  }

  highRiskTiersList(): readonly ApprovalRiskTier[] {
    return [...this.highRiskTiers];
  }
}

export const defaultApprovalPolicy = new ApprovalPolicy();

export function isHighRisk(tier: ApprovalRiskTier): boolean {
  return (
    tier === "external" || tier === "destructive" || tier === "billing"
  );
}