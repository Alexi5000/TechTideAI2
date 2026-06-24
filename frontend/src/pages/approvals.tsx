/**
 * Approvals Page
 *
 * HITL approval queue. Operators see pending high-risk agent actions, can
 * grant or deny each one with rationale, and inspect history.
 */

import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { useApprovals } from "@/hooks/use-approvals.js";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { Textarea } from "@/components/ui/textarea.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { IconShield, IconCheck, IconX, IconRefresh } from "@/components/icons/index.js";
import { useToastContext } from "@/contexts/toast-context.js";
import type { ApprovalRequest } from "@/lib/api-client.js";
import type { DashboardContextType } from "@/components/layout/index.js";

function riskVariant(tier: ApprovalRequest["riskTier"]): "default" | "warning" | "error" {
  if (tier === "billing" || tier === "destructive") return "error";
  if (tier === "external") return "warning";
  return "default";
}

function ApprovalCard({
  approval,
  onGrant,
  onDeny,
}: {
  approval: ApprovalRequest;
  onGrant: (rationale: string) => Promise<void>;
  onDeny: (rationale: string) => Promise<void>;
}) {
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-mono text-sm text-[var(--muted-strong)]">{approval.id.substring(0, 8)}…</p>
            <Badge variant={riskVariant(approval.riskTier)}>{approval.riskTier}</Badge>
            <Badge variant="default">{approval.status}</Badge>
          </div>
          <p className="text-sm">
            Agent <span className="font-medium">{approval.agentId}</span> requested approval to{" "}
            <span className="font-medium">{approval.action}</span>.
          </p>
          <p className="text-xs text-[var(--muted)]">
            Run: {approval.runId.substring(0, 8)}… · requested {new Date(approval.requestedAt).toLocaleString()}
            {approval.expiresAt ? ` · expires ${new Date(approval.expiresAt).toLocaleString()}` : ""}
          </p>
        </div>
      </div>

      <details className="mb-3">
        <summary className="text-sm text-[var(--muted)] cursor-pointer">Payload</summary>
        <pre className="mt-2 p-3 bg-[var(--surface-1)] rounded text-xs overflow-x-auto">
          {JSON.stringify(approval.payload, null, 2)}
        </pre>
      </details>

      {approval.status === "pending" && (
        <div className="space-y-3">
          <Textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Optional rationale (recorded in audit log)"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={async () => {
                setBusy(true);
                try {
                  await onGrant(rationale);
                  setRationale("");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              aria-label="Grant approval"
            >
              <IconCheck size={16} />
              Grant
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                setBusy(true);
                try {
                  await onDeny(rationale);
                  setRationale("");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              aria-label="Deny approval"
            >
              <IconX size={16} />
              Deny
            </Button>
          </div>
        </div>
      )}

      {approval.status !== "pending" && approval.decidedAt && (
        <p className="text-sm text-[var(--muted)]">
          {approval.status === "granted" ? "Granted" : "Denied"} by{" "}
          <span className="font-medium">{approval.decidedBy ?? "—"}</span> ·{" "}
          {new Date(approval.decidedAt).toLocaleString()}
          {approval.rationale ? ` · "${approval.rationale}"` : ""}
        </p>
      )}
    </Card>
  );
}

export function ApprovalsPage() {
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const [tab, setTab] = useState<"pending" | "granted" | "denied" | "expired">("pending");
  const { approvals, loading, error, refetch, grant, deny } = useApprovals({
    status: tab,
    pollIntervalMs: tab === "pending" ? 5000 : 0,
  });
  const { addToast } = useToastContext();

  return (
    <PageTransition>
      <Topbar
        title="Approval Queue"
        onMobileMenuToggle={onMobileMenuToggle}
        actions={
          <Button variant="ghost" onClick={refetch} aria-label="Refresh">
            <IconRefresh size={18} />
          </Button>
        }
      />

      <div className="p-6 max-w-[var(--content-max-width)] mx-auto space-y-6">
        <p className="text-[var(--muted-strong)]">
          High-risk agent actions pause here for human review. Grant to resume the run; deny to fail it with the
          captured rationale. See <code>docs/adr/0004-approval-as-execution-boundary.md</code>.
        </p>

        <div className="flex items-center gap-2">
          {(["pending", "granted", "denied", "expired"] as const).map((status) => (
            <Button
              key={status}
              variant={tab === status ? "primary" : "ghost"}
              size="sm"
              onClick={() => setTab(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-lg">
            <p className="text-[var(--error)]">{error.message}</p>
          </div>
        )}

        {loading ? (
          <Card className="animate-pulse">
            <div className="h-20 w-full bg-[var(--stroke)] rounded" />
          </Card>
        ) : approvals.length === 0 ? (
          <EmptyState
            icon={<IconShield size={48} />}
            title={`No ${tab} approvals`}
            description={
              tab === "pending"
                ? "The queue is clear. Agent actions are flowing without human gating right now."
                : `No approvals have been ${tab} in this view yet.`
            }
          />
        ) : (
          <div className="space-y-4">
            {approvals.map((a) => (
              <ApprovalCard
                key={a.id}
                approval={a}
                onGrant={async (rationale) => {
                  await grant(a.id, rationale);
                  addToast({ variant: "success", title: "Approved", description: a.action });
                }}
                onDeny={async (rationale) => {
                  await deny(a.id, rationale);
                  addToast({ variant: "info", title: "Denied", description: a.action });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
