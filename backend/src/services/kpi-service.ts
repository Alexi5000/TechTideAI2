import type { SupabaseClient } from "@supabase/supabase-js";
import { PersistenceUnavailableError, RepositoryOperationError } from "../domain/index.js";

export interface KpiTotals {
  runsTotal: number;
  running: number;
  queued: number;
  succeeded: number;
  failed: number;
  canceled: number;
}

export interface AgentKpiSummary {
  agentId: string;
  runCount: number;
  successRate: number;
}

export interface KpiSummary {
  orgId: string;
  range: { from: string; to: string };
  totals: KpiTotals;
  successRate: number;
  avgDurationMs: number | null;
  lastRunAt: string | null;
  topAgents: AgentKpiSummary[];
}

interface RunRow {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  agent_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export function createKpiService(supabase: SupabaseClient | null) {
  function requireSupabase(): SupabaseClient {
    if (!supabase) {
      throw new PersistenceUnavailableError(
        "Supabase client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    return supabase;
  }

  return {
    async getKpis(orgId: string, days: number): Promise<KpiSummary> {
      const client = requireSupabase();
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

      const { data, error } = await client
        .from("runs")
        .select("id,status,agent_id,started_at,finished_at,created_at")
        .eq("org_id", orgId)
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        throw new RepositoryOperationError("fetch KPIs", error.message);
      }

      const runs = (data ?? []) as RunRow[];
      const totals: KpiTotals = {
        runsTotal: 0,
        running: 0,
        queued: 0,
        succeeded: 0,
        failed: 0,
        canceled: 0,
      };

      let durationSum = 0;
      let durationCount = 0;
      let lastRunAt: string | null = null;

      const agentStats = new Map<string, { runCount: number; successCount: number }>();

      for (const run of runs) {
        totals.runsTotal += 1;
        totals[run.status] += 1;

        if (!lastRunAt) {
          lastRunAt = run.created_at;
        }

        if (run.started_at && run.finished_at) {
          const duration =
            new Date(run.finished_at).getTime() - new Date(run.started_at).getTime();
          if (!Number.isNaN(duration) && duration >= 0) {
            durationSum += duration;
            durationCount += 1;
          }
        }

        if (run.agent_id) {
          const entry = agentStats.get(run.agent_id) ?? { runCount: 0, successCount: 0 };
          entry.runCount += 1;
          if (run.status === "succeeded") {
            entry.successCount += 1;
          }
          agentStats.set(run.agent_id, entry);
        }
      }

      const successRate =
        totals.runsTotal > 0
          ? Math.round((totals.succeeded / totals.runsTotal) * 100)
          : 0;

      const avgDurationMs = durationCount > 0 ? Math.round(durationSum / durationCount) : null;

      const topAgents = [...agentStats.entries()]
        .map(([agentId, stats]) => ({
          agentId,
          runCount: stats.runCount,
          successRate:
            stats.runCount > 0
              ? Math.round((stats.successCount / stats.runCount) * 100)
              : 0,
        }))
        .sort((a, b) => b.runCount - a.runCount)
        .slice(0, 5);

      return {
        orgId,
        range: { from: from.toISOString(), to: to.toISOString() },
        totals,
        successRate,
        avgDurationMs,
        lastRunAt,
        topAgents,
      };
    },
  };
}
