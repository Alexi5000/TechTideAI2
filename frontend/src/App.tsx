import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";

const orchestrators = [
  {
    title: "Veronica Cozy (Agent 0)",
    description: "Executive orchestration, scheduling, and strategy synthesis.",
  },
  {
    title: "Ava Cozy",
    description: "Operations, SOPs, task routing, and process hygiene.",
  },
  {
    title: "Finn Cozy",
    description: "Internal support, onboarding, policy, and culture care.",
  },
  {
    title: "Cipher Cozy",
    description: "Finance, forecasting, dashboards, and cost optimization.",
  },
  {
    title: "Axel Cozy",
    description: "Sales execution, lead generation, and CRM hygiene.",
  },
  {
    title: "Luna Cozy",
    description: "Marketing campaigns, outreach, and distribution workflows.",
  },
  {
    title: "Ellie Cozy",
    description: "Customer support, intake, scheduling, and voice concierge.",
  },
  {
    title: "Veronica Cozy (Lite)",
    description: "Client-side orchestration without exposing internal systems.",
  },
  {
    title: "Audrey Cozy",
    description: "AI and workflow audits, ROI discovery, and remediation plans.",
  },
  {
    title: "Sage Cozy",
    description: "Content operations that turn workflows into reusable assets.",
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
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,164,0.35),transparent_65%)] animate-[float_18s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute left-0 top-32 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_center,rgba(247,90,53,0.25),transparent_70%)] animate-[float_22s_ease-in-out_infinite]" />

        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--accent)] shadow-[0_12px_24px_rgba(247,90,53,0.35)]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                TechTideAI
              </p>
              <p className="text-xs text-[var(--muted-strong)]">Company-scale agent platform</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--muted-strong)] md:flex">
            <a href="#platform" className="hover:text-[var(--ink)]">
              Platform
            </a>
            <a href="#orchestrators" className="hover:text-[var(--ink)]">
              Orchestrators
            </a>
            <a href="#architecture" className="hover:text-[var(--ink)]">
              Architecture
            </a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/agents">
              <Button variant="ghost">View Agents</Button>
            </Link>
            <Link to="/console/ceo">
              <Button>Launch Console</Button>
            </Link>
          </div>
        </header>

        <main className="mx-auto flex max-w-6xl flex-col gap-24 px-6 pb-24 pt-12">
          <section className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Badge>Operating system for AI companies</Badge>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[var(--ink)]">
                Run an entire company with an AI org chart that actually ships.
              </h1>
              <p className="text-lg text-[var(--muted-strong)] leading-relaxed">
                TechTideAI connects a CEO agent, ten orchestrators, and 50 worker agents into a single
                execution fabric. Every decision is backed by evidence, mapped to outcomes, and measured
                in real time.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/agents">
                  <Button size="lg">Get the platform</Button>
                </Link>
                <a href="#architecture">
                  <Button variant="secondary" size="lg">
                    See architecture
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap gap-8 text-sm text-[var(--muted)]">
                <div>
                  <p className="text-2xl font-semibold text-[var(--ink)]">1</p>
                  <p>CEO Agent</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[var(--ink)]">10</p>
                  <p>Orchestrators</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[var(--ink)]">50</p>
                  <p>Worker Agents</p>
                </div>
              </div>
            </div>
            <Card className="relative overflow-hidden">
              <div className="space-y-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
                  Live Signal
                </p>
                <h3 className="font-display text-2xl text-[var(--ink)]">Executive AI Control Room</h3>
                <p className="text-sm text-[var(--muted-strong)]">
                  Orchestrators surface risks, the CEO agent resolves trade-offs, and workflows are queued
                  with audit-ready traces.
                </p>
                <div className="grid gap-4">
                  {pillars.map((pillar) => (
                    <div
                      key={pillar.title}
                      className="rounded-2xl border border-[var(--stroke)] bg-white/70 p-4"
                    >
                      <p className="text-sm font-semibold text-[var(--ink)]">{pillar.title}</p>
                      <p className="text-xs text-[var(--muted-strong)]">{pillar.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          <section id="platform" className="space-y-10">
            <SectionHeader
              eyebrow="Platform"
              title="A full-stack agent platform with evidence-first execution."
              description="Every orchestration step is mapped to data, decisions, and the people (or agents) accountable for results."
            />
            <div className="grid gap-6 md:grid-cols-3">
              {platform.map((item) => (
                <Card key={item.title}>
                  <h3 className="font-display text-xl text-[var(--ink)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted-strong)]">{item.description}</p>
                </Card>
              ))}
            </div>
          </section>

          <section id="orchestrators" className="space-y-10">
            <SectionHeader
              eyebrow="Leadership layer"
              title="Ten orchestrators keep every domain aligned."
              description="Each orchestrator owns a domain, reports to the CEO agent, and coordinates specialized workers."
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {orchestrators.map((item) => (
                <Card key={item.title}>
                  <h3 className="text-lg font-semibold text-[var(--ink)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted-strong)]">{item.description}</p>
                </Card>
              ))}
            </div>
          </section>

          <section id="architecture" className="grid gap-10 md:grid-cols-2">
            <SectionHeader
              eyebrow="Architecture"
              title="Designed for scale, safety, and clarity."
              description="Separate control planes for strategy and execution keep complexity from leaking across domains."
            />
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-[var(--ink)]">Control Plane</h3>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  CEO + orchestrators plan, approve, and audit decisions with measurable outcomes.
                </p>
              </Card>
              <Card>
                <h3 className="text-lg font-semibold text-[var(--ink)]">Execution Plane</h3>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  Worker agents and automation pipelines execute tasks with Supabase-backed history.
                </p>
              </Card>
              <Card>
                <h3 className="text-lg font-semibold text-[var(--ink)]">Evidence Plane</h3>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  Every decision is tied to sources, KPIs, and risk controls to keep humans in the loop.
                </p>
              </Card>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-2)] p-10 text-center">
            <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[rgba(14,165,164,0.15)] blur-2xl" />
            <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[rgba(247,90,53,0.2)] blur-2xl" />
            <div className="relative space-y-4">
              <h2 className="font-display text-3xl text-[var(--ink)]">Ready to run your AI company?</h2>
              <p className="text-sm text-[var(--muted-strong)]">
                Spin up the CEO agent, link your data, and let the orchestrators keep the company on pace.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/console/ceo">
                  <Button size="lg">Try the CEO Agent</Button>
                </Link>
                <Link to="/agents">
                  <Button variant="secondary" size="lg">
                    View All Agents
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
