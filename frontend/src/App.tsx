import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MatrixRain } from "@/components/matrix-rain";

const features = [
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

export default function App() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <MatrixRain opacity={0.08} />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Single Card */}
        <div className="w-full max-w-lg rounded-2xl border border-[var(--accent)]/30 bg-black/80 p-8 backdrop-blur-md shadow-[0_0_40px_rgba(0,255,65,0.15)]">
          {/* Logo + Brand */}
          <div className="mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--accent)] shadow-[var(--shadow-glow)]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)] matrix-text-glow">
                TechTideAI
              </p>
              <p className="text-xs text-[var(--muted)]">Company-scale agent platform</p>
            </div>
          </div>

          {/* Tagline */}
          <h1 className="font-display mb-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Run an entire company with{" "}
            <span className="text-[var(--accent)] matrix-text-glow">61 AI agents</span>{" "}
            that actually ship.
          </h1>

          <p className="mb-6 text-sm leading-relaxed text-[var(--muted-strong)]">
            TechTideAI connects a CEO agent, ten orchestrators, and 50 worker agents into a single
            execution fabric. Every decision is backed by evidence, mapped to outcomes, and measured
            in real time.
          </p>

          {/* Stats */}
          <div className="mb-8 flex gap-6">
            {[
              { value: "1", label: "CEO" },
              { value: "10", label: "Orchestrators" },
              { value: "50", label: "Workers" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-[var(--accent)] matrix-text-glow">{stat.value}</p>
                <p className="text-xs text-[var(--muted)]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="mb-8 space-y-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-[var(--stroke)] bg-[var(--surface-1)] px-4 py-3"
              >
                <p className="text-sm font-semibold text-[var(--accent)]">{feature.title}</p>
                <p className="text-xs text-[var(--muted)]">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link to="/dashboard" className="block">
            <Button size="lg" className="w-full">
              Enter Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
