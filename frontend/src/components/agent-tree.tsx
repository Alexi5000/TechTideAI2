/**
 * Agent Tree Component
 *
 * Visual hierarchy: CEO → Orchestrators → Workers
 * with SVG connection lines and real-time status.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils.js";
import { AgentNode, type AgentNodeStatus } from "@/components/agent-node.js";
import type { Agent, ExecutionMapNode } from "@/lib/api-client.js";

export interface AgentTreeProps {
  ceo: Agent;
  orchestrators: Agent[];
  workers: Agent[];
  executionNodes: ExecutionMapNode[];
  isEnabled: (agentId: string) => boolean;
  onToggle: (agentId: string, enabled: boolean) => void;
}

function getStatus(node: ExecutionMapNode | undefined): AgentNodeStatus {
  if (!node) return "idle";
  if (node.runStats.running > 0 || node.runStats.queued > 0) return "running";
  if (node.runStats.failed > node.runStats.succeeded && node.runStats.runsTotal > 0) return "error";
  return "idle";
}

export function AgentTree({
  ceo,
  orchestrators,
  workers,
  executionNodes,
  isEnabled,
  onToggle,
}: AgentTreeProps) {
  const treeRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  const nodeMap = new Map(executionNodes.map((n) => [n.id, n]));

  // Group workers by their orchestrator
  const workersByOrch = new Map<string, Agent[]>();
  for (const w of workers) {
    const parent = w.reportsTo ?? "unknown";
    const list = workersByOrch.get(parent) ?? [];
    list.push(w);
    workersByOrch.set(parent, list);
  }

  const computeLines = useCallback(() => {
    if (!treeRef.current) return;
    const container = treeRef.current;
    const rect = container.getBoundingClientRect();

    const newLines: { x1: number; y1: number; x2: number; y2: number }[] = [];

    const ceoEl = container.querySelector('[data-node="ceo"]');
    const orchEls = container.querySelectorAll("[data-tier='orchestrator']");

    if (ceoEl) {
      const ceoR = ceoEl.getBoundingClientRect();
      const ceoBottom = { x: ceoR.left + ceoR.width / 2 - rect.left, y: ceoR.bottom - rect.top };

      orchEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        const top = { x: r.left + r.width / 2 - rect.left, y: r.top - rect.top };
        newLines.push({ x1: ceoBottom.x, y1: ceoBottom.y, x2: top.x, y2: top.y });

        // Lines from orchestrator to its workers
        const orchId = el.getAttribute("data-id");
        if (orchId) {
          const workerEls = container.querySelectorAll(`[data-parent="${orchId}"]`);
          const orchBottom = { x: r.left + r.width / 2 - rect.left, y: r.bottom - rect.top };
          workerEls.forEach((wEl) => {
            const wR = wEl.getBoundingClientRect();
            const wTop = { x: wR.left + wR.width / 2 - rect.left, y: wR.top - rect.top };
            newLines.push({ x1: orchBottom.x, y1: orchBottom.y, x2: wTop.x, y2: wTop.y });
          });
        }
      });
    }

    setLines(newLines);
  }, []);

  useEffect(() => {
    computeLines();
    window.addEventListener("resize", computeLines);
    // Recompute after fonts load and images settle
    const timer = setTimeout(computeLines, 500);
    return () => {
      window.removeEventListener("resize", computeLines);
      clearTimeout(timer);
    };
  }, [computeLines, orchestrators.length, workers.length]);

  return (
    <div ref={treeRef} className="relative overflow-x-auto py-4">
      {/* SVG Connection Lines */}
      {lines.length > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width="100%"
          height="100%"
          style={{ zIndex: 0 }}
        >
          {lines.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(0, 255, 65, 0.2)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
        </svg>
      )}

      {/* CEO Row */}
      <div className="relative z-10 flex justify-center mb-8">
        <div data-node="ceo">
          <AgentNode
            id={ceo.id}
            name={ceo.name}
            tier="ceo"
            domain={ceo.domain}
            status={getStatus(nodeMap.get(ceo.id))}
            runCount={nodeMap.get(ceo.id)?.runStats.runsTotal ?? 0}
            successRate={nodeMap.get(ceo.id)?.runStats.successRate ?? 0}
            enabled={isEnabled(ceo.id)}
            onToggle={(v) => onToggle(ceo.id, v)}
          />
        </div>
      </div>

      {/* Orchestrators Row */}
      <div className="relative z-10 flex flex-wrap justify-center gap-3 mb-8">
        {orchestrators.map((orch) => (
          <div key={orch.id} data-tier="orchestrator" data-id={orch.id}>
            <AgentNode
              id={orch.id}
              name={orch.name}
              tier="orchestrator"
              domain={orch.domain}
              status={getStatus(nodeMap.get(orch.id))}
              runCount={nodeMap.get(orch.id)?.runStats.runsTotal ?? 0}
              successRate={nodeMap.get(orch.id)?.runStats.successRate ?? 0}
              enabled={isEnabled(orch.id)}
              onToggle={(v) => onToggle(orch.id, v)}
            />
          </div>
        ))}
      </div>

      {/* Workers Row — grouped by orchestrator */}
      <div className="relative z-10 space-y-6">
        {orchestrators.map((orch) => {
          const orchWorkers = workersByOrch.get(orch.id);
          if (!orchWorkers?.length) return null;

          return (
            <div key={orch.id}>
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-2 pl-1">
                {orch.name}&apos;s team ({orchWorkers.length})
              </p>
              <div className={cn("flex flex-wrap gap-2")}>
                {orchWorkers.map((w) => (
                  <div key={w.id} data-tier="worker" data-parent={orch.id}>
                    <AgentNode
                      id={w.id}
                      name={w.name}
                      tier="worker"
                      domain={w.domain}
                      status={getStatus(nodeMap.get(w.id))}
                      runCount={nodeMap.get(w.id)?.runStats.runsTotal ?? 0}
                      successRate={nodeMap.get(w.id)?.runStats.successRate ?? 0}
                      enabled={isEnabled(w.id)}
                      onToggle={(v) => onToggle(w.id, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
