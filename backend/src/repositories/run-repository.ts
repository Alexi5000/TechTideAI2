/**
 * Supabase Run Repository Implementation
 *
 * Infrastructure layer: implements IRunRepository using Supabase client.
 * Handles snake_case (DB) to camelCase (TS) mapping.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PersistenceUnavailableError } from "../domain/index.js";
import type {
  IRunRepository,
  Run,
  RunEvent,
  CreateRunInput,
  UpdateRunStatusInput,
  DbRun,
  DbRunEvent,
} from "./types.js";

function mapDbRunToRun(dbRun: DbRun): Run {
  return {
    id: dbRun.id,
    orgId: dbRun.org_id,
    agentId: dbRun.agent_id,
    status: dbRun.status,
    input: dbRun.input,
    output: dbRun.output,
    error: dbRun.error,
    startedAt: dbRun.started_at,
    finishedAt: dbRun.finished_at,
    createdAt: dbRun.created_at,
    updatedAt: dbRun.updated_at,
  };
}

function mapDbRunEventToRunEvent(dbEvent: DbRunEvent): RunEvent {
  return {
    id: dbEvent.id,
    runId: dbEvent.run_id,
    orgId: dbEvent.org_id,
    eventType: dbEvent.event_type,
    payload: dbEvent.payload,
    createdAt: dbEvent.created_at,
  };
}

/**
 * Supabase-specific persistence error.
 * Extends domain PersistenceUnavailableError for proper error hierarchy.
 */
export class SupabaseNotConfiguredError extends PersistenceUnavailableError {
  constructor() {
    super(
      "Supabase client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export function createRunRepository(
  supabase: SupabaseClient | null,
): IRunRepository {
  function requireSupabase(): SupabaseClient {
    if (!supabase) {
      throw new SupabaseNotConfiguredError();
    }
    return supabase;
  }

  return {
    async create(input: CreateRunInput): Promise<Run> {
      const client = requireSupabase();

      const { data, error } = await client
        .from("runs")
        .insert({
          org_id: input.orgId,
          agent_id: input.agentId,
          input: input.input,
          status: "queued",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create run: ${error.message}`);
      }

      return mapDbRunToRun(data as DbRun);
    },

    async findById(id: string): Promise<Run | null> {
      const client = requireSupabase();

      const { data, error } = await client
        .from("runs")
        .select()
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Row not found
          return null;
        }
        throw new Error(`Failed to find run: ${error.message}`);
      }

      return mapDbRunToRun(data as DbRun);
    },

    async findByOrgId(orgId: string, limit = 50): Promise<Run[]> {
      const client = requireSupabase();

      const { data, error } = await client
        .from("runs")
        .select()
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to list runs: ${error.message}`);
      }

      return (data as DbRun[]).map(mapDbRunToRun);
    },

    async updateStatus(id: string, updates: UpdateRunStatusInput): Promise<Run> {
      const client = requireSupabase();

      const updatePayload: Record<string, unknown> = {
        status: updates.status,
      };

      if (updates.output !== undefined) {
        updatePayload["output"] = updates.output;
      }
      if (updates.error !== undefined) {
        updatePayload["error"] = updates.error;
      }
      if (updates.startedAt !== undefined) {
        updatePayload["started_at"] = updates.startedAt;
      }
      if (updates.finishedAt !== undefined) {
        updatePayload["finished_at"] = updates.finishedAt;
      }

      const { data, error } = await client
        .from("runs")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update run status: ${error.message}`);
      }

      return mapDbRunToRun(data as DbRun);
    },

    async addEvent(
      runId: string,
      orgId: string,
      eventType: string,
      payload: Record<string, unknown>,
    ): Promise<RunEvent> {
      const client = requireSupabase();

      const { data, error } = await client
        .from("run_events")
        .insert({
          run_id: runId,
          org_id: orgId,
          event_type: eventType,
          payload: payload,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add run event: ${error.message}`);
      }

      return mapDbRunEventToRunEvent(data as DbRunEvent);
    },
  };
}
