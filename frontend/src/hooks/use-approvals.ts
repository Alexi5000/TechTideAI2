/**
 * Approvals Hook
 *
 * Polls the approvals queue. The dashboard shell passes a polling interval
 * (default 5s) so multiple panels stay in sync.
 */

import { useCallback, useEffect, useState } from "react";

import { apiClient, type ApprovalRequest } from "@/lib/api-client.js";

export interface UseApprovalsResult {
  approvals: ApprovalRequest[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  grant: (id: string, rationale?: string) => Promise<void>;
  deny: (id: string, rationale?: string) => Promise<void>;
}

export function useApprovals(opts: { status?: ApprovalRequest["status"]; pollIntervalMs?: number; limit?: number } = {}): UseApprovalsResult {
  const { status = "pending", pollIntervalMs = 5000, limit = 50 } = opts;
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      const fetched = await apiClient.getApprovals({ status, limit });
      setApprovals(fetched);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [status, limit]);

  useEffect(() => {
    void load();
    if (!pollIntervalMs) return;
    const id = setInterval(() => void load(), pollIntervalMs);
    return () => clearInterval(id);
  }, [load, pollIntervalMs]);

  const grant = useCallback(
    async (id: string, rationale?: string) => {
      await apiClient.grantApproval(id, rationale);
      await load();
    },
    [load],
  );

  const deny = useCallback(
    async (id: string, rationale?: string) => {
      await apiClient.denyApproval(id, rationale);
      await load();
    },
    [load],
  );

  return { approvals, loading, error, refetch: load, grant, deny };
}
