import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App.js";

describe("App", () => {
  it("renders the hero headline and primary CTAs", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /run an entire company with an ai org chart/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /get the platform/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /see architecture/i }),
    ).toBeInTheDocument();
  });
});
