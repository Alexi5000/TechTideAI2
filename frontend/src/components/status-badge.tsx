/**
 * Status Badge Component
 *
 * Displays run status with appropriate styling and optional animation.
 * Shared between Console and Runs pages.
 */

interface StatusBadgeProps {
  status: string;
  showPulse?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  succeeded: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  canceled: "bg-gray-100 text-gray-800",
};

export function StatusBadge({ status, showPulse = true }: StatusBadgeProps) {
  const colorClasses = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  const isRunning = status === "running";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses}`}
    >
      {showPulse && isRunning && (
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-1.5" />
      )}
      {status}
    </span>
  );
}
