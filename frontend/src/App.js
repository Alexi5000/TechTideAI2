import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";
const orchestrators = [
    {
        title: "Strategy",
        description: "Competitive sensing, scenario planning, and objective alignment.",
    },
    {
        title: "Product",
        description: "Roadmap, UX research, and customer value delivery.",
    },
    {
        title: "Engineering",
        description: "Platform reliability, scale, and safety rails.",
    },
    {
        title: "Operations",
        description: "Execution cadence, dependency mapping, and delivery health.",
    },
    {
        title: "Growth",
        description: "Acquisition systems, activation loops, and messaging.",
    },
    {
        title: "Sales",
        description: "Pipeline health, partnerships, and enterprise enablement.",
    },
    {
        title: "Customer",
        description: "Retention, onboarding, and support escalation.",
    },
    {
        title: "Finance",
        description: "Runway, budget control, and risk exposure.",
    },
    {
        title: "People",
        description: "Capacity planning, performance, and culture.",
    },
];
const pillars = [
    {
        title: "Agent Graph",
        description: "Mastra-driven orchestration binds CEO, orchestrators, and workers into a living org chart.",
    },
    {
        title: "Evidence Layer",
        description: "Every decision traces back to sources, audits, and measurable KPIs.",
    },
    {
        title: "Execution Fabric",
        description: "Supabase-backed workflow state, run history, and tool outputs.",
    },
];
const platform = [
    {
        title: "OpenAI + Claude",
        description: "Provider-agnostic routing with policy enforcement and cost controls.",
    },
    {
        title: "LangGraph + LangChain",
        description: "Python toolchains for deep research, planning, and automation.",
    },
    {
        title: "Supabase",
        description: "Structured data, audit logs, and secure multi-tenant storage.",
    },
];
export default function App() {
    return (_jsx("div", { className: "min-h-screen bg-[var(--bg)] text-[var(--ink)]", children: _jsxs("div", { className: "relative overflow-hidden", children: [_jsx("div", { className: "pointer-events-none absolute -top-40 right-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,164,0.35),transparent_65%)] animate-[float_18s_ease-in-out_infinite]" }), _jsx("div", { className: "pointer-events-none absolute left-0 top-32 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_center,rgba(247,90,53,0.25),transparent_70%)] animate-[float_22s_ease-in-out_infinite]" }), _jsxs("header", { className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-10 w-10 rounded-2xl bg-[var(--accent)] shadow-[0_12px_24px_rgba(247,90,53,0.35)]" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]", children: "TechTideAI" }), _jsx("p", { className: "text-xs text-[var(--muted-strong)]", children: "Company-scale agent platform" })] })] }), _jsxs("nav", { className: "hidden items-center gap-6 text-sm font-medium text-[var(--muted-strong)] md:flex", children: [_jsx("a", { href: "#platform", className: "hover:text-[var(--ink)]", children: "Platform" }), _jsx("a", { href: "#orchestrators", className: "hover:text-[var(--ink)]", children: "Orchestrators" }), _jsx("a", { href: "#architecture", className: "hover:text-[var(--ink)]", children: "Architecture" })] }), _jsxs("div", { className: "hidden items-center gap-3 md:flex", children: [_jsx(Link, { to: "/agents", children: _jsx(Button, { variant: "ghost", children: "View Agents" }) }), _jsx(Link, { to: "/console/ceo", children: _jsx(Button, { children: "Launch Console" }) })] })] }), _jsxs("main", { className: "mx-auto flex max-w-6xl flex-col gap-24 px-6 pb-24 pt-12", children: [_jsxs("section", { className: "grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]", children: [_jsxs("div", { className: "space-y-6", children: [_jsx(Badge, { children: "Operating system for AI companies" }), _jsx("h1", { className: "font-display text-4xl sm:text-5xl lg:text-6xl text-[var(--ink)]", children: "Run an entire company with an AI org chart that actually ships." }), _jsx("p", { className: "text-lg text-[var(--muted-strong)] leading-relaxed", children: "TechTideAI connects a CEO agent, nine senior orchestrators, and a fleet of workers into a single execution fabric. Every decision is backed by evidence, mapped to outcomes, and measured in real time." }), _jsxs("div", { className: "flex flex-wrap gap-4", children: [_jsx(Link, { to: "/agents", children: _jsx(Button, { size: "lg", children: "Get the platform" }) }), _jsx("a", { href: "#architecture", children: _jsx(Button, { variant: "secondary", size: "lg", children: "See architecture" }) })] }), _jsxs("div", { className: "flex flex-wrap gap-8 text-sm text-[var(--muted)]", children: [_jsxs("div", { children: [_jsx("p", { className: "text-2xl font-semibold text-[var(--ink)]", children: "1" }), _jsx("p", { children: "CEO Agent" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-2xl font-semibold text-[var(--ink)]", children: "9" }), _jsx("p", { children: "Orchestrators" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-2xl font-semibold text-[var(--ink)]", children: "Many" }), _jsx("p", { children: "Worker Agents" })] })] })] }), _jsx(Card, { className: "relative overflow-hidden", children: _jsxs("div", { className: "space-y-6", children: [_jsx("p", { className: "text-sm font-semibold uppercase tracking-[0.25em] text-[var(--muted)]", children: "Live Signal" }), _jsx("h3", { className: "font-display text-2xl text-[var(--ink)]", children: "Executive AI Control Room" }), _jsx("p", { className: "text-sm text-[var(--muted-strong)]", children: "Orchestrators surface risks, the CEO agent resolves trade-offs, and workflows are queued with audit-ready traces." }), _jsx("div", { className: "grid gap-4", children: pillars.map((pillar) => (_jsxs("div", { className: "rounded-2xl border border-[var(--stroke)] bg-white/70 p-4", children: [_jsx("p", { className: "text-sm font-semibold text-[var(--ink)]", children: pillar.title }), _jsx("p", { className: "text-xs text-[var(--muted-strong)]", children: pillar.description })] }, pillar.title))) })] }) })] }), _jsxs("section", { id: "platform", className: "space-y-10", children: [_jsx(SectionHeader, { eyebrow: "Platform", title: "A full-stack agent platform with evidence-first execution.", description: "Every orchestration step is mapped to data, decisions, and the people (or agents) accountable for results." }), _jsx("div", { className: "grid gap-6 md:grid-cols-3", children: platform.map((item) => (_jsxs(Card, { children: [_jsx("h3", { className: "font-display text-xl text-[var(--ink)]", children: item.title }), _jsx("p", { className: "mt-2 text-sm text-[var(--muted-strong)]", children: item.description })] }, item.title))) })] }), _jsxs("section", { id: "orchestrators", className: "space-y-10", children: [_jsx(SectionHeader, { eyebrow: "Leadership layer", title: "Nine orchestrators keep every domain aligned.", description: "Each orchestrator owns a domain, reports to the CEO agent, and coordinates specialized workers." }), _jsx("div", { className: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3", children: orchestrators.map((item) => (_jsxs(Card, { children: [_jsx("h3", { className: "text-lg font-semibold text-[var(--ink)]", children: item.title }), _jsx("p", { className: "mt-2 text-sm text-[var(--muted-strong)]", children: item.description })] }, item.title))) })] }), _jsxs("section", { id: "architecture", className: "grid gap-10 md:grid-cols-2", children: [_jsx(SectionHeader, { eyebrow: "Architecture", title: "Designed for scale, safety, and clarity.", description: "Separate control planes for strategy and execution keep complexity from leaking across domains." }), _jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { children: [_jsx("h3", { className: "text-lg font-semibold text-[var(--ink)]", children: "Control Plane" }), _jsx("p", { className: "mt-2 text-sm text-[var(--muted-strong)]", children: "CEO + orchestrators plan, approve, and audit decisions with measurable outcomes." })] }), _jsxs(Card, { children: [_jsx("h3", { className: "text-lg font-semibold text-[var(--ink)]", children: "Execution Plane" }), _jsx("p", { className: "mt-2 text-sm text-[var(--muted-strong)]", children: "Worker agents and automation pipelines execute tasks with Supabase-backed history." })] }), _jsxs(Card, { children: [_jsx("h3", { className: "text-lg font-semibold text-[var(--ink)]", children: "Evidence Plane" }), _jsx("p", { className: "mt-2 text-sm text-[var(--muted-strong)]", children: "Every decision is tied to sources, KPIs, and risk controls to keep humans in the loop." })] })] })] }), _jsxs("section", { className: "relative overflow-hidden rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-2)] p-10 text-center", children: [_jsx("div", { className: "absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[rgba(14,165,164,0.15)] blur-2xl" }), _jsx("div", { className: "absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[rgba(247,90,53,0.2)] blur-2xl" }), _jsxs("div", { className: "relative space-y-4", children: [_jsx("h2", { className: "font-display text-3xl text-[var(--ink)]", children: "Ready to run your AI company?" }), _jsx("p", { className: "text-sm text-[var(--muted-strong)]", children: "Spin up the CEO agent, link your data, and let the orchestrators keep the company on pace." }), _jsxs("div", { className: "flex flex-wrap justify-center gap-4", children: [_jsx(Link, { to: "/console/ceo", children: _jsx(Button, { size: "lg", children: "Try the CEO Agent" }) }), _jsx(Link, { to: "/agents", children: _jsx(Button, { variant: "secondary", size: "lg", children: "View All Agents" }) })] })] })] })] })] }) }));
}
