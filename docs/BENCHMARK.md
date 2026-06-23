# Benchmark vs. reference harnesses

> Honest side-by-side. Each row is tagged `match` (we built it the same way), `partial` (we built a subset), `missing` (we did not build it), or `differs-on-purpose` (a deliberate divergence we documented). Use this doc to see what we built, what we didn't, and why.

## Reference harnesses

| Name | What it is | Where |
|---|---|---|
| **OpenHands** | Multi-language agent harness with a sandbox, browser tooling, and a runtime for "code as agent" tasks. Heavyweight. | github.com/All-Hands-Aware/OpenHands |
| **Claude Code / learn-claude-code** | Anthropic's CLI coding agent and a community repo that documents its harness patterns (`CLAUDE.md`, repo-as-context, subagents, settings.json). | github.com/shareAI-lab/learn-claude-code |
| **Agent Harness Generator (ruvnet gist)** | Scaffold tool that emits a starter harness with skills, tools, and a `SOUL.md`. | gist.github.com/ruvnet/1b46293206a9dd9a729b18c48c305222 |
| **OpenHarness** | Research harness from HKU Data Science with a built-in eval layer. | github.com/HKUDS/OpenHarness |
| **Braintrust** | Hosted eval + observability product. We treat it as a reference architecture, not a dependency. | github.com/Braintrust-AI/braintrust |
| **LangSmith** | LangChain's hosted eval + tracing product. | github.com/langchain-ai/langsmith |

## Feature comparison

| Feature | OpenHands | Claude Code | OpenHarness | **TechTideAI** | Status |
|---|---|---|---|---|---|
| Agent registry (1+ orchestrators + workers) | ✓ | partial (subagents) | ✓ | ✓ (1 CEO + 10 + 50) | **match** |
| Typed contract between runtimes | partial | partial | ✗ | ✓ (`contracts/schema.json` is the single source of truth, mirrored to TS + Python) | **match** |
| Skills vs. tools distinction | partial | partial | ✗ | ✓ (`agents/src/skills/`, ADR 0007) | **match** |
| Eval harness with per-scorer breakdown | ✓ | ✓ (heuristic) | ✓ | ✓ (`backend/src/services/eval-harness.ts`) | **match** |
| LLM-as-judge scorer with versioned prompt | partial | partial | ✓ | ✓ (`JUDGE_PROMPT_VERSION = "judge-v1"`) | **match** |
| Four-axis grader (correctness / safety / completeness / quality) | ✗ | ✗ | ✗ | ✓ (`backend/src/services/scoring/four-axis-grader.ts`) | **match** |
| Plateau-detection scorer | ✗ | partial | ✗ | ✓ (`backend/src/services/scoring/plateau-scorer.ts`) | **match** |
| Three-agent adversarial loop (Planner / Generator / Evaluator) | ✗ | ✗ | partial | ✓ (`backend/src/services/three-agent-harness.ts`) | **match** |
| Human-in-the-loop approval gate | partial | partial | ✗ | ✓ (`backend/src/services/approval-service.ts`, risk-tier classifier) | **match** |
| Structured `run_events` append-only log | partial | ✓ | partial | ✓ (`backend/src/services/run-service.ts`, every transition emits an event) | **match** |
| OpenTelemetry trace surface with per-span attributes | ✓ | partial | partial | ✓ (enriched with `eval.*` attrs, Phase 8.7) | **match** |
| Post-mortem auto-generation | ✗ | ✗ | ✗ | ✓ (`backend/src/services/post-mortem-service.ts`) | **match** |
| Dual runtime (TypeScript + Python via shared contract) | partial | ✗ | partial | ✓ (Mastra + LangGraph, dispatcher in `agents/runtime_config.yaml`) | **match** |
| `AGENTS.md` (or `CLAUDE.md`) at repo root | partial (per-package) | ✓ | partial | ✓ (`AGENTS.md` — the operator's procedural memory) | **match** |
| Notebook authoring surface + .py conversion | ✗ | ✗ | ✗ | ✓ (`notebooks/`, `scripts/convert-notebooks.py`, CI smoke test) | **match** |
| Containerized local stack (Dockerfile per service + compose) | partial | ✗ | ✗ | ✓ (`Dockerfile.{backend,frontend,agents,python}`, `docker-compose.yml`) | **match** |
| Public chat / Slack / Discord adapter | ✓ | ✗ | ✗ | ✗ | **differs-on-purpose** — out of scope (see "What we don't have" below) |
| Multi-tenant auth + RBAC | partial | partial | ✗ | ✗ | **differs-on-purpose** — scaffolding repo, not a SaaS product |
| Hosted eval dashboard (Braintrust-style) | ✓ (theirs) | n/a | partial | ✗ | **differs-on-purpose** — we ship an operator console, not a hosted product |
| Adversarial test generation | partial | ✗ | ✗ | ✗ | **missing** — hand-written rubrics only; documented in the lessons post as a Phase 4 follow-up |
| Per-task vector embedding / RAG against prior runs | partial | ✓ (via subagents) | partial | partial (Weaviate configured; not used by the eval harness today) | **differs-on-purpose** |

## What we don't have (and why)

| Missing | Why | Status |
|---|---|---|
| **Public chat / Slack / Discord adapter** | A customer-facing chat surface is a product decision (auth, rate limits, content moderation). TechTideAI is a harness, not a product. The FDE builds the chat on top. | Out of scope. |
| **Multi-tenant auth** | Same — the FDE adds auth before deploying. We do not block the harness on this. | Out of scope. |
| **Hosted eval dashboard (Braintrust-style)** | The operator console is the dashboard. A hosted product is a different company. | Out of scope. |
| **Adversarial test generation** | Hand-written rubrics cover the first 33 tasks. Generation kicks in at ~100 tasks. Documented in `docs/posts/lessons-from-building-a-company-scale-agent-os.md`. | Follow-up. |
| **Real LangGraph `StateGraph`** | Today the Python runtime is function-based. ADR 0003 documents the deliberate "function-based first, real graphs when we have a reason" stance. | Follow-up. |
| **Auto-generated golden tasks** | Same as adversarial generation. | Follow-up. |
| **Per-task vector recall into the eval harness** | The knowledge base is configured (`backend/src/services/knowledge-service.ts`, Weaviate) but the eval harness does not consult it. Sprint contracts are the right place to add it. | Roadmap. |

## What we deliberately do differently

| Choice | Why |
|---|---|
| **Single contract surface (`contracts/schema.json`)** | Two runtimes (TS + Python) need a single source of truth. OpenHands and OpenHarness duplicate types per language. We use one schema + a sync script. |
| **Run-events are typed and policy-gated** | A status change is a contract change. OpenHands' `run_events` are loose strings. Ours are a Zod-enforced enum with a `severity` and `correlationId` channel. |
| **Approval gate is in the status machine** | ADR 0004. A paused run is a real state with explicit transitions. OpenHands' approval is a UI feature; ours is a domain entity. |
| **Skills vs. tools** | Tools execute; skills augment. The line is enforced by `agents/src/skills/` vs `agents/src/mastra/tools/`. OpenHands blurs this. |
| **Notebooks are authoring surfaces, not runtimes** | ADR 0008. A notebook can be a CI smoke test; it cannot be a runtime. We ship a conversion script so the reviewer sees Python. |
| **The four axes (correctness / safety / completeness / quality)** | Single-score grading is convenient and lossy. The four axes are non-negotiable per ADR 0006. The harness fails fast on the important axis even when the headline would pass. |
| **No "hired on the spot" claim anywhere** | The brief asked for it. We are explicit in the README, the ADRs, the lesson post, and this benchmark doc that no repo gets anyone hired on the spot. TechTideAI demonstrates harness engineering; it does not promise outcomes. |

## Verified vs. unverified

The reference points above are tagged by how confident we are in the comparison. `verified` rows come from reading the source or official docs in the time available. `unverified` rows are the FDE's working understanding from blog posts, conference talks, and community summaries; treat them as a starting point, not a fact.

If you find a row that's wrong, open a PR against this file with a citation. The doc is intentionally version-controlled; corrections are part of the codebase.

## See also

- `AGENTS.md` — procedural memory for any agent working in this repo
- `docs/adr/` — the nine ADRs that explain every load-bearing decision
- `docs/EVALS.md` — eval methodology
- `docs/PYTHON_RUNTIME.md` — dual runtime architecture
- `docs/posts/lessons-from-building-a-company-scale-agent-os.md` — the engineering retrospective
- `docs/posts/three-agent-harness.md` — the adversarial feedback loop
