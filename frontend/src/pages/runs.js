import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * Runs Page
 *
 * Lists run history for the organization.
 */
import { Link } from "react-router-dom";
import { useRuns } from "../hooks/use-runs";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/status-badge";
function RunCard({ run }) {
    return (_jsxs(Card, { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsxs("p", { className: "font-mono text-sm text-[var(--muted-strong)] truncate", children: [run.id.substring(0, 8), "..."] }), _jsx(StatusBadge, { status: run.status })] }), _jsxs("p", { className: "text-sm text-[var(--muted)]", children: ["Agent: ", _jsx("span", { className: "font-medium", children: run.agentId ?? "Unknown" })] }), _jsx("p", { className: "text-xs text-[var(--muted)]", children: new Date(run.createdAt).toLocaleString() })] }), run.agentId && (_jsx(Link, { to: `/console/${run.agentId}`, children: _jsx(Button, { size: "sm", variant: "ghost", children: "View Agent" }) }))] }));
}
export function RunsPage() {
    const { runs, loading, error, refetch } = useRuns();
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-[var(--bg)] flex items-center justify-center", children: _jsx("div", { className: "text-[var(--muted-strong)]", children: "Loading runs..." }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-[var(--bg)] text-[var(--ink)]", children: [_jsx("header", { className: "border-b border-[var(--stroke)] bg-[var(--surface-2)]", children: _jsxs("div", { className: "mx-auto max-w-6xl px-6 py-4 flex items-center justify-between", children: [_jsx("div", { className: "flex items-center gap-3", children: _jsxs(Link, { to: "/", className: "flex items-center gap-3", children: [_jsx("div", { className: "h-8 w-8 rounded-xl bg-[var(--accent)]" }), _jsx("span", { className: "font-semibold", children: "TechTideAI" })] }) }), _jsxs("nav", { className: "flex items-center gap-4", children: [_jsx(Link, { to: "/agents", className: "text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--ink)]", children: "Agents" }), _jsx(Link, { to: "/runs", className: "text-sm font-medium text-[var(--ink)]", children: "Runs" })] })] }) }), _jsxs("main", { className: "mx-auto max-w-6xl px-6 py-12", children: [_jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: "Run History" }), _jsx("p", { className: "text-[var(--muted-strong)]", children: "View past agent executions and their results." })] }), _jsx(Button, { onClick: refetch, variant: "secondary", children: "Refresh" })] }), error && (_jsx("div", { className: "p-4 bg-red-50 border border-red-200 rounded-lg mb-6", children: _jsx("p", { className: "text-red-700", children: error.message }) })), runs.length === 0 ? (_jsx(Card, { children: _jsxs("div", { className: "text-center py-8", children: [_jsx("p", { className: "text-[var(--muted-strong)] mb-4", children: "No runs yet." }), _jsx(Link, { to: "/agents", children: _jsx(Button, { children: "Run Your First Agent" }) })] }) })) : (_jsx("div", { className: "space-y-4", children: runs.map((run) => (_jsx(RunCard, { run: run }, run.id))) }))] })] }));
}
