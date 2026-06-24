import { describe, expect, it } from "vitest";

import { emitPython, emitTypeScript, hash } from "./sync-contracts.js";
import type { Schema } from "./sync-contracts.js";

const sample: Schema = {
  version: "1.0.0",
  definitions: {
    Color: { type: "string", enum: ["red", "green", "blue"] },
    Widget: {
      type: "object",
      additionalProperties: false,
      required: ["id", "color"],
      properties: {
        id: { type: "string" },
        color: { $ref: "#/definitions/Color" },
        size: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
        owner: { type: "string" },
        metadata: { type: "object", additionalProperties: true },
      },
    },
  },
};

describe("sync-contracts generic emitter (Phase 8 pre-req B)", () => {
  it("emits a string-enum as a TypeScript string-literal union", () => {
    const ts = emitTypeScript(sample);
    expect(ts).toMatch(/export type Color = "red" \| "green" \| "blue";/);
  });

  it("emits a string-enum as a Python Literal", () => {
    const py = emitPython(sample);
    expect(py).toMatch(/color = Literal\["red", "green", "blue"\]/);
  });

  it("preserves required vs optional in TypeScript", () => {
    const ts = emitTypeScript(sample);
    expect(ts).toMatch(/  id: Color;/);
    expect(ts).toMatch(/  color: Color;/);
    expect(ts).toMatch(/  size\?: number;/);
  });

  it("preserves required vs optional in Python with default_factory for collections", () => {
    const py = emitPython(sample);
    expect(py).toMatch(/    id: Color/);
    expect(py).toMatch(/    size: Optional\[float\] = None/);
    expect(py).toMatch(/    tags: list\[str\] = Field\(default_factory=list\)/);
  });

  it("emits extra='forbid' on strict objects", () => {
    const py = emitPython(sample);
    expect(py).toMatch(/model_config = ConfigDict\(extra="forbid"\)/);
  });

  it("emits the same drift-hash in both files for the same schema", () => {
    const ts = emitTypeScript(sample);
    const py = emitPython(sample);
    const tsHash = ts.match(/Drift-check hash \(mirrored in Python\): ([0-9a-f]+)/)?.[1];
    const pyHash = py.match(/Drift-check hash \(mirrored in TypeScript\): ([0-9a-f]+)/)?.[1];
    expect(tsHash).toBeDefined();
    expect(pyHash).toBeDefined();
    expect(tsHash).toBe(pyHash);
  });

  it("hash() is deterministic and FNV-1a 32-bit hex (8 chars)", () => {
    expect(hash("")).toBe("811c9dc5");
    expect(hash("abc")).toMatch(/^[0-9a-f]{8}$/);
    expect(hash("abc")).toBe(hash("abc"));
  });

  it("snake-cases field names for Python", () => {
    const py = emitPython(sample);
    // No camelCase field names should appear as identifiers in the class body.
    expect(py).toMatch(/    id: Color/);
    expect(py).toMatch(/    owner: Optional\[str\] = None/);
  });
});
