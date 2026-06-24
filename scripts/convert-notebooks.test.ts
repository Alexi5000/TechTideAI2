import { describe, expect, it } from "vitest";

import { convertOne } from "./convert-notebooks.js";

const SAMPLE_IPYNB = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { display_name: "Python 3" } },
  cells: [
    {
      cell_type: "markdown",
      source: ["# Title\n", "\n", "Some prose.\n"],
      metadata: {},
    },
    {
      cell_type: "code",
      source: ["import os\n", "print(os.getcwd())\n"],
      metadata: {},
      outputs: [],
      execution_count: 1,
    },
    {
      cell_type: "markdown",
      source: ["## Section\n", "More prose.\n"],
      metadata: {},
    },
    {
      cell_type: "code",
      source: ["x = 1\n", "y = 2\n"],
      metadata: {},
      outputs: [],
    },
  ],
};

describe("convertOne (Phase 8.6)", () => {
  it("emits a docstring for the first markdown cell", async () => {
    const py = await convertOne(SAMPLE_IPYNB);
    expect(py).toMatch(/^"""/);
    expect(py).toMatch(/# Title/);
  });

  it("emits code cells as code, markdown as comments", async () => {
    const py = await convertOne(SAMPLE_IPYNB);
    expect(py).toMatch(/import os/);
    expect(py).toMatch(/x = 1/);
    expect(py).toMatch(/y = 2/);
  });

  it("strips outputs, execution_count, and per-cell metadata", async () => {
    const py = await convertOne(SAMPLE_IPYNB);
    expect(py).not.toMatch(/outputs/);
    expect(py).not.toMatch(/execution_count/);
  });

  it("returns empty string for a notebook with no cells", async () => {
    const py = await convertOne({ cells: [], metadata: {} });
    expect(py).toBe("");
  });

  it("treats a cell whose source is all Python comments as markdown", async () => {
    const py = await convertOne({
      cells: [
        { cell_type: "code", source: ["# pure comment cell\n"], metadata: {}, outputs: [] },
        { cell_type: "code", source: ["real_code = 1\n"], metadata: {}, outputs: [] },
      ],
    });
    // The pure-comment cell should be a comment in the .py (no executable).
    expect(py).toMatch(/^# pure comment cell$/m);
    // The real-code cell is plain code.
    expect(py).toMatch(/^real_code = 1$/m);
  });
});
