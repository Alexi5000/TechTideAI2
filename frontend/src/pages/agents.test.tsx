import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";

// Default mock: loading state
const useAgentsMock = vi.fn();

vi.mock("@/hooks/use-agents.js", () => ({
  useAgents: (...args: unknown[]) => useAgentsMock(...args),
}));

// Must import after mock
const { AgentsPage } = await import("./agents.js");

function renderWithDashboardContext() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/agents"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={<Outlet context={{ onMobileMenuToggle: () => {} }} />}
        >
          <Route path="agents" element={<AgentsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const sampleRegistry = {
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
};

describe("AgentsPage", () => {
  it("renders loading skeletons when loading", () => {
    useAgentsMock.mockReturnValue({
      loading: true,
      error: null,
      refetch: vi.fn(),
      registry: null,
    });

    const { container } = renderWithDashboardContext();
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders agent cards grouped by tier", () => {
    useAgentsMock.mockReturnValue({
      loading: false,
      error: null,
      refetch: vi.fn(),
      registry: sampleRegistry,
    });

    renderWithDashboardContext();

    expect(screen.getByText("CEO")).toBeInTheDocument();
    expect(screen.getByText("Orchestrators (1)")).toBeInTheDocument();
    expect(screen.getByText("Workers (1)")).toBeInTheDocument();
    expect(screen.getByText("Brian Cozy")).toBeInTheDocument();
    expect(screen.getByText("Veronica Cozy")).toBeInTheDocument();
    expect(screen.getByText("Research Analyst")).toBeInTheDocument();
  });

  it("renders error state with Retry button", () => {
    useAgentsMock.mockReturnValue({
      loading: false,
      error: new Error("Network failure"),
      refetch: vi.fn(),
      registry: null,
    });

    renderWithDashboardContext();

    expect(screen.getByText(/network failure/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
