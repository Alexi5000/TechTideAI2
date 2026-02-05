/**
 * Status Badge Component
 *
 * Displays run status with appropriate styling and optional animation.
 * Uses the Badge component with semantic color variants.
 */

import { Badge, type BadgeProps } from "@/components/ui/badge.js";
import { IconCheck, IconX, IconLoader, IconAlert } from "@/components/icons/index.js";

type RunStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

interface StatusBadgeProps {
  status: string;
  showPulse?: boolean;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  RunStatus,
  { variant: BadgeProps["variant"]; icon: React.ReactNode; label: string }
> = {
  queued: {
    variant: "warning",
    icon: <IconAlert size={12} />,
    label: "Queued",
  },
  running: {
    variant: "info",
    icon: <IconLoader size={12} className="animate-spin" />,
    label: "Running",
  },
  succeeded: {
    variant: "success",
    icon: <IconCheck size={12} />,
    label: "Succeeded",
  },
  failed: {
    variant: "error",
    icon: <IconX size={12} />,
    label: "Failed",
  },
  canceled: {
    variant: "outline",
    icon: <IconX size={12} />,
    label: "Canceled",
  },
};

export function StatusBadge({
  status,
  showPulse = true,
  showIcon = true,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as RunStatus] ?? {
    variant: "default" as const,
    icon: null,
    label: status,
  };

  const isRunning = status === "running";

  return (
    <Badge variant={config.variant} className="gap-1.5">
      {showIcon && config.icon}
      {showPulse && isRunning && !showIcon && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {config.label}
    </Badge>
  );
}
