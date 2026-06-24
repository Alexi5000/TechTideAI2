/**
 * PostMortem Service (Phase 2.4)
 *
 * Auto-generates a markdown post-mortem for each completed run. The post-mortem
 * captures what the agent was asked, what it returned, what the audit trail
 * looks like, and what we'd do differently next time. Lives at
 * `docs/EVALS/post-mortems/<run-id>.md` so the engineering team can review
 * runs without a database query.
 *
 * Design notes:
 * - Generation is best-effort and never blocks the run lifecycle. If write
 *   fails we log a warning and move on; the run itself is the source of truth.
 * - The output is intentionally readable Markdown, not JSON. The whole point
 *   of a post-mortem is that a tired human can scan it.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { IRunRepository } from "../repositories/types.js";
import type { Run } from "../domain/index.js";

export interface PostMortemServiceDeps {
  runRepository: IRunRepository;
  outputDir?: string;
  judge?: (text: string) => Promise<string>;
}

export class PostMortemService {
  private readonly repo: IRunRepository;
  private readonly outputDir: string;
  private readonly judge: ((text: string) => Promise<string>) | undefined;

  constructor(deps: PostMortemServiceDeps) {
    this.repo = deps.runRepository;
    this.outputDir = deps.outputDir ?? resolve(process.cwd(), "../../docs/EVALS/post-mortems");
    this.judge = deps.judge;
  }

  async generate(run: Run): Promise<string> {
    const events = await this.repo.findEventsByRunId(run.id);
    const sections: string[] = [
      this.header(run),
      this.summary(run, events),
      this.eventTimeline(events),
      this.output(run),
      this.reflection(run),
    ];

    if (this.judge) {
      try {
        const reflection = await this.judge(this.reflectionPrompt(run));
        sections.push(`## LLM Reflection\n\n${reflection}\n`);
      } catch {
        // Reflection is optional.
      }
    }

    const md = sections.join("\n\n") + "\n";
    await mkdir(this.outputDir, { recursive: true });
    const path = resolve(this.outputDir, `${run.id}.md`);
    await writeFile(path, md, "utf8");
    return path;
  }

  private header(run: Run): string {
    return [
      `# Post-mortem: ${run.id}`,
      "",
      `- Agent: \`${run.agentId ?? "unknown"}\``,
      `- Status: \`${run.status}\``,
      `- Started: ${run.startedAt ?? ", "}`,
      `- Finished: ${run.finishedAt ?? ", "}`,
      ``,
    ].join("\n");
  }

  private summary(run: Run, events: unknown[]): string {
    const errorLine = run.error ? `\n- Error: ${run.error}` : "";
    return `## Summary\n\n- Status: **${run.status}**${errorLine}\n- Events recorded: ${events.length}\n`;
  }

  private eventTimeline(events: ReadonlyArray<{ eventType: string; createdAt: string; payload: Record<string, unknown> }>): string {
    if (events.length === 0) return "## Event Timeline\n\n_No events recorded._";
    const rows = events
      .map((e) => `- \`${e.createdAt}\` **${e.eventType}**, ${summarizePayload(e.payload)}`)
      .join("\n");
    return `## Event Timeline\n\n${rows}`;
  }

  private output(run: Run): string {
    const out = run.output ?? {};
    return `## Output\n\n\`\`\`json\n${JSON.stringify(out, null, 2)}\n\`\`\``;
  }

  private reflection(run: Run): string {
    const lines = [
      "## Reflection",
      "",
      run.status === "succeeded"
        ? "- Run completed. Capture what worked, not just what failed."
        : `- Run did not succeed (${run.status}). What was the first signal that this run was off track?`,
      "- Were there tool calls that produced no useful result? Should they have been skipped?",
      "- Did the agent's plan match what was actually executed? If not, why?",
    ];
    return lines.join("\n");
  }

  private reflectionPrompt(run: Run): string {
    return [
      "You are writing a post-mortem for a production agent run.",
      `Run status: ${run.status}`,
      `Run input: ${JSON.stringify(run.input)}`,
      `Run output: ${JSON.stringify(run.output)}`,
      `Run error: ${run.error ?? "none"}`,
      "",
      "Write a 3-paragraph reflection covering:",
      "1. What this run was trying to do (one sentence).",
      "2. What went well or poorly, with specific evidence from the run.",
      "3. One concrete change to the agent, prompt, or tool wiring that would improve next time.",
    ].join("\n");
  }
}

function summarizePayload(payload: Record<string, unknown>): string {
  const entries = Object.entries(payload).slice(0, 3);
  if (entries.length === 0) return "(no payload)";
  return entries.map(([k, v]) => `${k}=${truncate(stringify(v))}`).join(" ");
}

function stringify(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function truncate(s: string, max = 80): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
