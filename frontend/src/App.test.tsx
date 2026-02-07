import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App.js";

describe("App", () => {
  it("renders the hero headline and enter dashboard CTA", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /run an entire company with 61 ai agents/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /enter dashboard/i }),
    ).toBeInTheDocument();
  });
});
