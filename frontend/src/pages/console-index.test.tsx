import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { ConsoleIndexPage } from "./console-index.js";

vi.mock("@/hooks/use-agents.js", () => ({
  useAgents: () => ({
    loading: false,
    error: null,
    refetch: vi.fn(),
    registry: {
      ceo: {
        id: "ceo",
        name: "Brian Cozy",
        tier: "ceo",
        domain: "Executive Leadership",
        mission: "Provide strategic decision support.",
        responsibilities: [],
        outputs: [],
        tools: ["llm-router"],
        metrics: [],
      },
      orchestrators: [
        {
          id: "orch-veronica",
          name: "Veronica Cozy",
          tier: "orchestrator",
          domain: "Executive Orchestration",
          mission: "Coordinate all agents.",
          responsibilities: [],
          outputs: [],
          tools: ["execution-map"],
          metrics: [],
        },
      ],
      workers: [
        {
          id: "worker-research",
          name: "Research Analyst",
          tier: "worker",
          domain: "Executive Research",
          mission: "Collect and synthesize research.",
          responsibilities: [],
          outputs: [],
          tools: ["market-intel"],
          metrics: [],
        },
      ],
    },
  }),
}));

function renderWithDashboardContext() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/console"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={<Outlet context={{ onMobileMenuToggle: () => {} }} />}
        >
          <Route path="console" element={<ConsoleIndexPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ConsoleIndexPage", () => {
  it("renders the agent count CTA", () => {
    renderWithDashboardContext();

    expect(
      screen.getByRole("button", { name: /browse all 3 agents/i }),
    ).toBeInTheDocument();
  });
});
