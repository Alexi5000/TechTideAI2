import { afterEach, describe, expect, it } from "vitest";

import {
  LangGraphBridgeError,
  createLangGraphBridge,
  pingLangGraphSidecar,
} from "./langgraph-bridge.js";
import type { AgentRunRequest, AgentRunResult } from "@techtide/agents";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("LangGraphBridge", () => {
  it("POSTs the request and unwraps the result", async () => {
    const request: AgentRunRequest = { agentId: "orch-centaurus-a", input: { prompt: "Q3 forecast" } };
    const fakeResult: AgentRunResult = {
      success: true,
      output: { numbers: { projectedMRR: 304678 } },
      events: [],
    };
    let received: { url: string; body: unknown } | null = null;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      received = { url, body: JSON.parse(init?.body as string) };
      return new Response(JSON.stringify({ result: fakeResult }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const bridge = createLangGraphBridge({ sidecarUrl: "http://localhost:4051" });
    const result = await bridge.execute(request);

    expect(received!.url).toBe("http://localhost:4051/run");
    expect((received!.body as { request: AgentRunRequest }).request.agentId).toBe("orch-centaurus-a");
    expect(result.success).toBe(true);
    expect((result.output as { numbers: { projectedMRR: number } }).numbers.projectedMRR).toBe(304678);
  });

  it("throws LangGraphBridgeError on non-2xx responses", async () => {
    globalThis.fetch = (async () =>
      new Response("upstream broken", { status: 502 })) as typeof fetch;
    const bridge = createLangGraphBridge({ sidecarUrl: "http://localhost:4051" });
    await expect(
      bridge.execute({ agentId: "orch-centaurus-a", input: {} }),
    ).rejects.toBeInstanceOf(LangGraphBridgeError);
  });

  it("pingLangGraphSidecar returns true on 200", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ status: "ok" }), { status: 200 })) as typeof fetch;
    await expect(pingLangGraphSidecar("http://localhost:4051")).resolves.toBe(true);
  });

  it("pingLangGraphSidecar returns false on network error", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;
    await expect(pingLangGraphSidecar("http://localhost:9999")).resolves.toBe(false);
  });
});
