import type { SupabaseClient } from "@supabase/supabase-js";
import { agentRegistry } from "@techtide/agents";
import { PersistenceUnavailableError, RepositoryOperationError } from "../domain/index.js";

interface RunRow {
  status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  agent_id: string | null;
  created_at: string;
}

export interface ExecutionMapNode {
  id: string;
  name: string;
  tier: string;
  reportsTo: string | null;
  runStats: {
    runsTotal: number;
    running: number;
    queued: number;
    succeeded: number;
    failed: number;
    canceled: number;
    successRate: number;
    lastRunAt: string | null;
  };
}

export interface ExecutionMapEdge {
  from: string;
  to: string;
}

export interface ExecutionMapSummary {
  nodes: ExecutionMapNode[];
  edges: ExecutionMapEdge[];
}

export function createExecutionMapService(supabase: SupabaseClient | null) {
  function requireSupabase(): SupabaseClient {
    if (!supabase) {
      throw new PersistenceUnavailableError(
        "Supabase client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    return supabase;
  }

  return {
    async getExecutionMap(orgId: string, days: number): Promise<ExecutionMapSummary> {
      const client = requireSupabase();
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

      const { data, error } = await client
        .from("runs")
        .select("status,agent_id,created_at")
        .eq("org_id", orgId)
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        throw new RepositoryOperationError("fetch execution map", error.message);
      }

      const runs = (data ?? []) as RunRow[];
      const statsByAgent = new Map<
        string,
        {
          runsTotal: number;
          running: number;
          queued: number;
          succeeded: number;
          failed: number;
          canceled: number;
          successCount: number;
          lastRunAt: string | null;
        }
      >();

      for (const run of runs) {
        if (!run.agent_id) continue;
        const entry = statsByAgent.get(run.agent_id) ?? {
          runsTotal: 0,
          running: 0,
          queued: 0,
          succeeded: 0,
          failed: 0,
          canceled: 0,
          successCount: 0,
          lastRunAt: null,
        };

        entry.runsTotal += 1;
        entry[run.status] += 1;
        if (run.status === "succeeded") {
          entry.successCount += 1;
        }
        if (!entry.lastRunAt) {
          entry.lastRunAt = run.created_at;
        }
        statsByAgent.set(run.agent_id, entry);
      }

      const nodes: ExecutionMapNode[] = agentRegistry.all.map((agent) => {
        const stats = statsByAgent.get(agent.id);
        const successRate = stats && stats.runsTotal > 0
          ? Math.round((stats.successCount / stats.runsTotal) * 100)
          : 0;
        return {
          id: agent.id,
          name: agent.name,
          tier: agent.tier,
          reportsTo: agent.reportsTo ?? null,
          runStats: {
            runsTotal: stats?.runsTotal ?? 0,
            running: stats?.running ?? 0,
            queued: stats?.queued ?? 0,
            succeeded: stats?.succeeded ?? 0,
            failed: stats?.failed ?? 0,
            canceled: stats?.canceled ?? 0,
            successRate,
            lastRunAt: stats?.lastRunAt ?? null,
          },
        };
      });

      const edges: ExecutionMapEdge[] = agentRegistry.all
        .filter((agent) => agent.reportsTo)
        .map((agent) => ({
          from: agent.id,
          to: agent.reportsTo as string,
        }));

      return { nodes, edges };
    },
  };
}
