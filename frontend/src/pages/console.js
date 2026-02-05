import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Console Page
 *
 * Agent execution console where users can run agents with custom input
 * and see real-time results.
 */
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAgent } from "../hooks/use-agents";
import { useAgentRun, useRunPolling } from "../hooks/use-runs";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { StatusBadge } from "../components/status-badge";
export function ConsolePage() {
    const { agentId } = useParams();
    const { agent, loading: agentLoading, notFound } = useAgent(agentId);
    const { run, loading: runLoading, startRun, reset } = useAgentRun();
    const { run: polledRun, isPolling } = useRunPolling(run?.id ?? null);
    const [prompt, setPrompt] = useState("");
    const currentRun = polledRun ?? run;
    const handleRun = async () => {
        if (!agentId || !prompt.trim())
            return;
        await startRun(agentId, { prompt: prompt.trim() });
    };
    const handleNewRun = () => {
        reset();
        setPrompt("");
    };
    if (agentLoading) {
        return (_jsx("div", { className: "min-h-screen bg-[var(--bg)] flex items-center justify-center", children: _jsx("div", { className: "text-[var(--muted-strong)]", children: "Loading agent..." }) }));
    }
    if (notFound) {
        return (_jsx("div", { className: "min-h-screen bg-[var(--bg)] flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsxs("p", { className: "text-[var(--muted-strong)] mb-4", children: ["Agent not found: ", agentId] }), _jsx(Link, { to: "/agents", children: _jsx(Button, { children: "Back to Agents" }) })] }) }));
    }
    if (!agent) {
        return null;
    }
    return (_jsxs("div", { className: "min-h-screen bg-[var(--bg)] text-[var(--ink)]", children: [_jsx("header", { className: "border-b border-[var(--stroke)] bg-[var(--surface-2)]", children: _jsxs("div", { className: "mx-auto max-w-4xl px-6 py-4 flex items-center justify-between", children: [_jsx("div", { className: "flex items-center gap-3", children: _jsxs(Link, { to: "/agents", className: "flex items-center gap-3", children: [_jsx("div", { className: "h-8 w-8 rounded-xl bg-[var(--accent)]" }), _jsx("span", { className: "font-semibold", children: "TechTideAI" })] }) }), _jsxs("nav", { className: "flex items-center gap-4", children: [_jsx(Link, { to: "/agents", className: "text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--ink)]", children: "Agents" }), _jsx(Link, { to: "/runs", className: "text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--ink)]", children: "Runs" })] })] }) }), _jsxs("main", { className: "mx-auto max-w-4xl px-6 py-12", children: [_jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h1", { className: "text-2xl font-bold", children: agent.name }), _jsx(Badge, { children: agent.tier })] }), _jsx("p", { className: "text-[var(--muted-strong)] mb-4", children: agent.domain }), _jsx("p", { className: "text-sm text-[var(--muted)]", children: agent.mission })] }), _jsxs(Card, { className: "mb-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-4", children: "Run Agent" }), _jsx("textarea", { value: prompt, onChange: (e) => setPrompt(e.target.value), placeholder: "Enter your prompt or instructions for the agent...", disabled: runLoading || isPolling, className: "w-full h-32 p-3 border border-[var(--stroke)] rounded-lg mb-4 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed" }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { onClick: handleRun, disabled: runLoading || isPolling || !prompt.trim(), className: "flex items-center gap-2", children: runLoading ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Starting..."] })) : isPolling ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Running..."] })) : ("Run Agent") }), currentRun && (_jsx(Button, { variant: "secondary", onClick: handleNewRun, children: "New Run" }))] })] }), currentRun && (_jsxs(Card, { children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Result" }), _jsx(StatusBadge, { status: currentRun.status })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-[var(--muted)] uppercase tracking-wider mb-1", children: "Run ID" }), _jsx("p", { className: "text-sm font-mono text-[var(--muted-strong)]", children: currentRun.id })] }), currentRun.error && (_jsx("div", { className: "p-3 bg-red-50 border border-red-200 rounded-lg", children: _jsx("p", { className: "text-sm text-red-700", children: currentRun.error }) })), currentRun.output && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-[var(--muted)] uppercase tracking-wider mb-1", children: "Output" }), _jsx("pre", { className: "p-3 bg-[var(--surface-1)] rounded-lg text-sm overflow-auto max-h-96", children: JSON.stringify(currentRun.output, null, 2) })] })), currentRun.finishedAt && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-[var(--muted)] uppercase tracking-wider mb-1", children: "Completed" }), _jsx("p", { className: "text-sm text-[var(--muted-strong)]", children: new Date(currentRun.finishedAt).toLocaleString() })] }))] })] })), _jsxs("div", { className: "mt-8", children: [_jsx("h3", { className: "text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3", children: "Available Tools" }), _jsx("div", { className: "flex flex-wrap gap-2", children: agent.tools.map((tool) => (_jsx("span", { className: "px-3 py-1 rounded-full bg-[var(--surface-1)] text-sm text-[var(--muted-strong)]", children: tool }, tool))) })] })] })] }));
}
