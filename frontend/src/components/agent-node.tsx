/**
 * Agent Node Component
 *
 * Individual node card for the agent hierarchy tree.
 * Shows agent name, status LED, tier badge, and toggle switch.
 */

import { Link } from "react-router-dom";
import { cn } from "@/lib/utils.js";
import { Badge } from "@/components/ui/badge.js";
import { ToggleSwitch } from "@/components/ui/toggle-switch.js";

export type AgentNodeStatus = "running" | "idle" | "error";

export interface AgentNodeProps {
  id: string;
  name: string;
  tier: "ceo" | "orchestrator" | "worker";
  domain: string;
  status: AgentNodeStatus;
  runCount: number;
  successRate: number;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

function StatusLed({ status }: { status: AgentNodeStatus }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        status === "running" && "bg-[var(--accent)] shadow-[0_0_8px_rgba(0,255,65,0.8)] animate-matrix-pulse",
        status === "idle" && "bg-[var(--accent)]/40",
        status === "error" && "bg-[var(--error)] shadow-[0_0_8px_rgba(255,51,51,0.6)]",
      )}
      title={status}
    />
  );
}

function tierLabel(tier: "ceo" | "orchestrator" | "worker"): string {
  if (tier === "ceo") return "CEO";
  if (tier === "orchestrator") return "ORCH";
  return "WORK";
}

export function AgentNode({
  id,
  name,
  tier,
  domain,
  status,
  runCount,
  successRate,
  enabled,
  onToggle,
}: AgentNodeProps) {
  return (
    <div
      className={cn(
        "group relative flex w-40 flex-col rounded-xl border px-3 py-3 transition-all",
        "bg-black/70 backdrop-blur-sm",
        enabled
          ? "border-[var(--accent)]/20 hover:border-[var(--accent)]/50 hover:shadow-[0_0_15px_rgba(0,255,65,0.2)]"
          : "border-neutral-800 opacity-50",
        tier === "ceo" && enabled && "border-[var(--accent)]/40 shadow-[0_0_12px_rgba(0,255,65,0.15)]",
      )}
    >
      {/* Header: Status + Name */}
      <div className="flex items-center gap-2 mb-1.5">
        <StatusLed status={enabled ? status : "idle"} />
        <Link
          to={`/dashboard/console/${id}`}
          className="truncate text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
          title={`${name} — ${domain}`}
        >
          {name}
        </Link>
      </div>

      {/* Tier Badge + Stats */}
      <div className="flex items-center justify-between mb-2">
        <Badge className="text-[10px] px-1.5 py-0.5">{tierLabel(tier)}</Badge>
        <span className="text-[10px] text-[var(--muted)]">
          {runCount}r · {successRate}%
        </span>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--muted)]">
          {enabled ? "Active" : "Off"}
        </span>
        <ToggleSwitch
          checked={enabled}
          onCheckedChange={onToggle}
          size="sm"
          label={`Toggle ${name}`}
        />
      </div>
    </div>
  );
}
