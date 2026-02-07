import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./sidebar.js";

function renderSidebar(collapsed = false, onToggleCollapse = vi.fn()) {
  return {
    onToggleCollapse,
    ...render(
      <MemoryRouter>
        <Sidebar collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </MemoryRouter>,
    ),
  };
}

describe("Sidebar", () => {
  it("renders all 4 navigation items", () => {
    renderSidebar();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Agents")).toBeInTheDocument();
    expect(screen.getByText("Console")).toBeInTheDocument();
    expect(screen.getByText("Runs")).toBeInTheDocument();
  });

  it("collapse button has correct aria-label", () => {
    renderSidebar(false);
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
  });

  it("calls onToggleCollapse when collapse button is clicked", async () => {
    const user = userEvent.setup();
    const { onToggleCollapse } = renderSidebar(false);

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });

  it("shows expand aria-label when collapsed", () => {
    renderSidebar(true);
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });
});
