/**
 * LangGraph Bridge - Backend ↔ Python sidecar
 *
 * The backend's `IAgentExecutionService` consults the `Dispatcher` to decide
 * which runtime to use for a given agent. When the dispatch routes to
 * LangGraph, this bridge POSTs the `AgentRunRequest` to the Python sidecar
 * (`SIDECAR_PORT`, default 4051) and returns the `AgentRunResult`.
 *
 * The bridge is `execute()` is the same shape as `IAgentRuntime.execute()` so
 * the execution service can pick it without forking.
 */

import { env } from "../config/env.js";
import type { AgentRunRequest, AgentRunResult, IAgentRuntime } from "@techtide/agents";

export interface LangGraphBridgeOptions {
  sidecarUrl: string;
  fetchTimeoutMs?: number;
}

export class LangGraphBridgeError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "LangGraphBridgeError";
  }
}

export function createLangGraphBridge(options: LangGraphBridgeOptions): IAgentRuntime {
  const timeout = options.fetchTimeoutMs ?? 30_000;

  return {
    async execute(request: AgentRunRequest): Promise<AgentRunResult> {
      const url = `${options.sidecarUrl.replace(/\/$/, "")}/run`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new LangGraphBridgeError(
            `langgraph sidecar returned ${response.status}: ${await response.text()}`,
            response.status,
          );
        }

        const body = (await response.json()) as { result: AgentRunResult };
        return body.result;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          throw new LangGraphBridgeError(`langgraph sidecar timed out after ${timeout}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** Returns a working LangGraphBridge if `LANGGRAPH_SIDECAR_URL` is set, else null. */
export function maybeLangGraphBridge(): IAgentRuntime | null {
  if (!env.LANGGRAPH_SIDECAR_URL) return null;
  return createLangGraphBridge({ sidecarUrl: env.LANGGRAPH_SIDECAR_URL });
}

/** Health check for the sidecar. Returns true iff `/healthz` returns 200. */
export async function pingLangGraphSidecar(sidecarUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${sidecarUrl.replace(/\/$/, "")}/healthz`);
    return res.ok;
  } catch {
    return false;
  }
}
