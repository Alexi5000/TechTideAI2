import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Agents Page
 *
 * Lists all agents from the registry organized by tier.
 * Users can navigate to the console to run individual agents.
 */
import { Link } from "react-router-dom";
import { useAgents } from "../hooks/use-agents";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
function AgentCard({ agent }) {
    return (_jsxs(Card, { className: "flex flex-col h-full", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsx("h3", { className: "text-lg font-semibold text-[var(--ink)]", children: agent.name }), _jsx(Badge, { children: agent.tier })] }), _jsx("p", { className: "text-sm text-[var(--muted-strong)] mb-3", children: agent.domain }), _jsx("p", { className: "text-sm text-[var(--muted)] flex-grow mb-4", children: agent.mission.length > 150
                    ? `${agent.mission.substring(0, 150)}...`
                    : agent.mission }), _jsxs("div", { className: "flex flex-wrap gap-1 mb-4", children: [agent.tools.slice(0, 3).map((tool) => (_jsx("span", { className: "text-xs px-2 py-0.5 rounded bg-[var(--surface-1)] text-[var(--muted-strong)]", children: tool }, tool))), agent.tools.length > 3 && (_jsxs("span", { className: "text-xs text-[var(--muted)]", children: ["+", agent.tools.length - 3, " more"] }))] }), _jsx(Link, { to: `/console/${agent.id}`, className: "mt-auto", children: _jsx(Button, { size: "sm", className: "w-full", children: "Run Agent" }) })] }));
}
export function AgentsPage() {
    const { registry, loading, error, refetch } = useAgents();
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-[var(--bg)] flex items-center justify-center", children: _jsx("div", { className: "text-[var(--muted-strong)]", children: "Loading agents..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "min-h-screen bg-[var(--bg)] flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsxs("p", { className: "text-red-600 mb-4", children: ["Error: ", error.message] }), _jsx(Button, { onClick: refetch, children: "Retry" })] }) }));
    }
    if (!registry) {
        return null;
    }
    return (_jsxs("div", { className: "min-h-screen bg-[var(--bg)] text-[var(--ink)]", children: [_jsx("header", { className: "border-b border-[var(--stroke)] bg-[var(--surface-2)]", children: _jsxs("div", { className: "mx-auto max-w-6xl px-6 py-4 flex items-center justify-between", children: [_jsx("div", { className: "flex items-center gap-3", children: _jsxs(Link, { to: "/", className: "flex items-center gap-3", children: [_jsx("div", { className: "h-8 w-8 rounded-xl bg-[var(--accent)]" }), _jsx("span", { className: "font-semibold", children: "TechTideAI" })] }) }), _jsxs("nav", { className: "flex items-center gap-4", children: [_jsx(Link, { to: "/agents", className: "text-sm font-medium text-[var(--ink)]", children: "Agents" }), _jsx(Link, { to: "/runs", className: "text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--ink)]", children: "Runs" })] })] }) }), _jsxs("main", { className: "mx-auto max-w-6xl px-6 py-12", children: [_jsxs("div", { className: "mb-12", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: "Agent Registry" }), _jsx("p", { className: "text-[var(--muted-strong)]", children: "Browse and run AI agents across the organization hierarchy." })] }), _jsxs("section", { className: "mb-12", children: [_jsxs("h2", { className: "text-xl font-semibold mb-4 flex items-center gap-2", children: [_jsx("span", { className: "w-3 h-3 rounded-full bg-[var(--accent)]" }), "CEO"] }), _jsx("div", { className: "max-w-md", children: _jsx(AgentCard, { agent: registry.ceo }) })] }), _jsxs("section", { className: "mb-12", children: [_jsxs("h2", { className: "text-xl font-semibold mb-4 flex items-center gap-2", children: [_jsx("span", { className: "w-3 h-3 rounded-full bg-teal-500" }), "Orchestrators (", registry.orchestrators.length, ")"] }), _jsx("div", { className: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3", children: registry.orchestrators.map((agent) => (_jsx(AgentCard, { agent: agent }, agent.id))) })] }), _jsxs("section", { children: [_jsxs("h2", { className: "text-xl font-semibold mb-4 flex items-center gap-2", children: [_jsx("span", { className: "w-3 h-3 rounded-full bg-blue-500" }), "Workers (", registry.workers.length, ")"] }), _jsx("div", { className: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3", children: registry.workers.map((agent) => (_jsx(AgentCard, { agent: agent }, agent.id))) })] })] })] }));
}
