#!/usr/bin/env tsx
/**
 * Contract Sync (Phase 4.1, generic as of Phase 8 pre-req B)
 *
 * The TypeScript and Python runtimes share an `IAgentRuntime` contract. The
 * single source of truth is `contracts/schema.json`. This script:
 *
 *   1. Reads `contracts/schema.json`.
 *   2. Walks `definitions` and emits:
 *        - `agents/src/runtime/contract-types.generated.ts`     (TypeScript types)
 *        - `agents/python/src/techtide_agents/contracts/generated.py` (Pydantic models)
 *   3. Emits a FNV-1a drift-check hash in both files. The Python test
 *      `tests/test_contract_sync.py` reads both and asserts equality, so
 *      any hand-edit to the generated files fails CI.
 *
 * Generic walker rules:
 *   - `enum` strings → TS string-literal union  AND  Python `Literal[...]`
 *   - `properties` → TS interface  AND  Pydantic `BaseModel`
 *   - `required`   → required TS fields  AND  required Pydantic fields
 *   - `additionalProperties: false` → `extra = "forbid"` in Pydantic
 *   - field name `camelCase` on the wire → `snake_case` in Pydantic
 *   - TypeScript preserves `camelCase` (matches the existing convention)
 *
 * Adding a new definition to `contracts/schema.json` is the only step a
 * contributor needs to make it appear in both runtimes.
 *
 * Usage:
 *   pnpm tsx scripts/sync-contracts.ts
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

interface JsonSchema {
  type?: string;
  enum?: ReadonlyArray<string | number | boolean>;
  properties?: Record<string, JsonSchema>;
  required?: ReadonlyArray<string>;
  additionalProperties?: boolean;
  items?: JsonSchema;
  $ref?: string;
  description?: string;
  format?: string;
}

interface Schema {
  version: string;
  definitions: Record<string, JsonSchema>;
}

const ROOT = resolve(process.cwd());
const SCHEMA_PATH = resolve(ROOT, "contracts/schema.json");

async function loadSchema(): Promise<Schema> {
  const raw = await readFile(SCHEMA_PATH, "utf8");
  return JSON.parse(raw) as Schema;
}

export function hash(s: string): string {
  // FNV-1a 32-bit. Deterministic, dependency-free.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function tsTypeName(name: string): string {
  // LlmProvider, AgentEventType, AgentRunRequest → keep as-is
  // Unknown name → PascalCase the field
  if (/^[A-Z][A-Za-z0-9]+$/.test(name)) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function pyTypeName(name: string): string {
  return toSnake(name).replace(/^_/, "").replace(/_+/g, "_");
}

function tsFieldType(field: JsonSchema, defs: Record<string, JsonSchema>, indent = ""): string {
  if (field.$ref) {
    const target = field.$ref.split("/").pop()!;
    return tsTypeName(target);
  }
  if (field.enum) {
    return field.enum.map((v) => JSON.stringify(v)).join(" | ");
  }
  switch (field.type) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object": {
      if (!field.properties) return "Record<string, unknown>";
      const props = Object.entries(field.properties).map(([k, v]) => {
        const opt = !field.required?.includes(k) ? "?" : "";
        return `${indent}  ${k}${opt}: ${tsFieldType(v, defs, indent + "  ")};`;
      });
      return `{\n${props.join("\n")}\n${indent}}`;
    }
    case "array":
      return `Array<${field.items ? tsFieldType(field.items, defs, indent) : "unknown"}>`;
    case "null":
      return "null";
    default:
      return "unknown";
  }
}

function pyFieldType(field: JsonSchema, defs: Record<string, JsonSchema>): string {
  if (field.$ref) {
    const target = field.$ref.split("/").pop()!;
    // Forward references use the PascalCase class name (the actual model
    // declaration), not the snake_case alias, Pydantic needs the class
    // symbol to resolve the reference at validation time.
    const pascal = pyTypeName(target).replace(/(^|_)([a-z])/g, (_, _p, c) => c.toUpperCase());
    return pascal;
  }
  if (field.enum) {
    return `Literal[${field.enum.map((v) => JSON.stringify(v)).join(", ")}]`;
  }
  switch (field.type) {
    case "string":
      return "str";
    case "integer":
    case "number":
      return "float";
    case "boolean":
      return "bool";
    case "object":
      return "dict[str, Any]";
    case "array":
      return `list[${field.items ? pyFieldType(field.items, defs) : "Any"}]`;
    case "null":
      return "None";
    default:
      return "Any";
  }
}

function isObjectLike(def: JsonSchema): boolean {
  return def.type === "object" && !!def.properties;
}

function isStringEnum(def: JsonSchema): boolean {
  return def.type === "string" && Array.isArray(def.enum) && def.enum.length > 0;
}

export function emitTypeScript(schema: Schema): string {
  const defs = Object.keys(schema.definitions);
  const lines: string[] = [
    "/**",
    " * Contract Types, GENERATED by scripts/sync-contracts.ts",
    " * DO NOT EDIT. Edit contracts/schema.json and re-run.",
    " */",
    `export const CONTRACT_VERSION = "${schema.version}" as const;`,
    "",
    `// Drift-check hash (mirrored in Python): ${hash(JSON.stringify(schema))}`,
    `export const CONTRACT_DEFINITIONS: ReadonlyArray<string> = ${JSON.stringify(defs)};`,
    "",
  ];

  for (const [name, def] of Object.entries(schema.definitions)) {
    if (isStringEnum(def)) {
      lines.push(`export type ${tsTypeName(name)} = ${def.enum!.map((v) => JSON.stringify(v)).join(" | ")};`);
      lines.push("");
      continue;
    }
    if (isObjectLike(def)) {
      const required = def.required ?? [];
      const props = Object.entries(def.properties!).map(([k, v]) => {
        const opt = required.includes(k) ? "" : "?";
        // Optional fields also get `| null` only if the schema marks them as null-union;
        // today the schema uses just optionality. We stay strict to schema as written.
        return `  ${k}${opt}: ${tsFieldType(v, schema.definitions)};`;
      });
      lines.push(`export interface ${tsTypeName(name)} {`);
      lines.push(...props);
      lines.push("}");
      lines.push("");
      continue;
    }
    // Scalar alias (e.g. `LlmUsage` referencing another def). Emit as type alias.
    lines.push(`export type ${tsTypeName(name)} = ${tsFieldType(def, schema.definitions)};`);
    lines.push("");
  }

  return lines.join("\n");
}

export function emitPython(schema: Schema): string {
  const defs = Object.keys(schema.definitions);
  const lines: string[] = [
    '"""',
    "Contract Models, GENERATED by scripts/sync-contracts.ts",
    "DO NOT EDIT. Edit contracts/schema.json and re-run.",
    '"""',
    "from __future__ import annotations",
    "",
    "from typing import Any, Literal, Optional",
    "from pydantic import BaseModel, ConfigDict, Field",
    "",
    `CONTRACT_VERSION: str = "${schema.version}"`,
    "",
  ];

  for (const [name, def] of Object.entries(schema.definitions)) {
    if (isStringEnum(def)) {
      const lits = def.enum!.map((v) => JSON.stringify(v)).join(", ");
      // String enums get PascalCase aliases so consumers can write
      // `AgentEventType` instead of `agent_event_type`. The Literal alias
      // keeps the snake_case form as the underlying type.
      const pascal = pyTypeName(name).replace(/(^|_)([a-z])/g, (_, _p, c) => c.toUpperCase());
      lines.push(`${pascal} = Literal[${lits}]`);
      lines.push(`${pyTypeName(name)} = ${pascal}`);
      lines.push("");
      continue;
    }
    if (isObjectLike(def)) {
      const required = def.required ?? [];
      const className = pyTypeName(name).replace(/(^|_)([a-z])/g, (_, _p, c) => c.toUpperCase());
      lines.push(`class ${className}(BaseModel):`);
      if (def.additionalProperties === false) {
        lines.push('    model_config = ConfigDict(extra="forbid")');
      }
      const propLines: string[] = [];
      for (const [k, v] of Object.entries(def.properties!)) {
        const pyName = toSnake(k);
        const isRequired = required.includes(k);
        const pyType = pyFieldType(v, schema.definitions);
        if (!isRequired && (pyType.startsWith("dict") || pyType.startsWith("list"))) {
          const factory = pyType.startsWith("list") ? "list" : "dict";
          propLines.push(`    ${pyName}: ${pyType} = Field(default_factory=${factory})`);
        } else if (!isRequired) {
          propLines.push(`    ${pyName}: Optional[${pyType}] = None`);
        } else {
          propLines.push(`    ${pyName}: ${pyType}`);
        }
      }
      lines.push(...propLines);
      lines.push("");
      continue;
    }
    lines.push(`${pyTypeName(name)} = ${pyFieldType(def, schema.definitions)}`);
    lines.push("");
  }

  lines.push(`# Drift-check hash (mirrored in TypeScript): ${hash(JSON.stringify(schema))}`);
  lines.push(
    `CONTRACT_DEFINITIONS: tuple[str, ...] = (${defs.map((d) => `"${d}"`).join(", ")},)`,
  );
  lines.push("");

  return lines.join("\n");
}

async function main(): Promise<void> {
  const schema = await loadSchema();
  const tsTarget = resolve(ROOT, "agents/src/runtime/contract-types.generated.ts");
  const pyTarget = resolve(ROOT, "agents/python/src/techtide_agents/contracts/generated.py");

  await mkdir(dirname(tsTarget), { recursive: true });
  await mkdir(dirname(pyTarget), { recursive: true });

  await writeFile(tsTarget, emitTypeScript(schema));
  await writeFile(pyTarget, emitPython(schema));

  // Format the generated Python with ruff so re-runs are idempotent.
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("python", ["-m", "ruff", "format", pyTarget], { stdio: "inherit" });
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ruff format exited ${code}`))));
    proc.on("error", reject);
  });

  process.stdout.write(`Wrote ${tsTarget}\n`);
  process.stdout.write(`Wrote ${pyTarget}\n`);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  main().catch((err) => {
    process.stderr.write(`${(err as Error).stack ?? err}\n`);
    process.exit(1);
  });
}
