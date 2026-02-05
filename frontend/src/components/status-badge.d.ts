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
export declare function StatusBadge({ status, showPulse }: StatusBadgeProps): import("react/jsx-runtime").JSX.Element;
export {};
