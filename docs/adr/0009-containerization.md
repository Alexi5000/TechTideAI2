# ADR 0009 — Per-service Dockerfiles + compose, deliberately no production stack

- **Status:** Accepted
- **Date:** 2026-06-23
- **Deciders:** TechTideAI platform team
- **Supersedes:** none

## Context

The PDF on FDE-aligned harness engineering is right that "the industry has largely moved past the notion of using Jupyter notebooks as a runtime component for production systems," and that the corollary discipline is to "containerize the entire agent application." We needed a container story that matched the rest of the harness: typed, observable, testable.

The trap is going from "containerize" to "build a full production deployment stack" — which is what most monorepos do, and which is the wrong scope for a portfolio piece. Production deployment is a separate decision (Vercel, Railway, Fly.io, Kubernetes) and the FDE makes that decision per customer.

## Decision

We ship a **local development stack** built from per-service Dockerfiles and a single `docker-compose.yml`:

- `Dockerfile.backend` — multi-stage Node 20 build, non-root runtime, `/health` healthcheck.
- `Dockerfile.frontend` — Vite build → nginx:alpine; `frontend/nginx.conf` reverse-proxies `/api/*` to `backend:4050`.
- `Dockerfile.agents` — Mastra dev image. Optional; not the production runtime.
- `Dockerfile.python` — Python 3.11-slim; uvicorn. Optional; only when an orchestrator routes to langgraph.
- `docker-compose.yml` — postgres:16, weaviate, backend, frontend, and (in the `full` profile) `agents-python`. Healthchecks gate dependencies via `depends_on: condition: service_healthy`.
- `docker-compose.override.yml.example` — local dev overrides (mount source for live reload).
- `.dockerignore` at the repo root.
- `scripts/smoke-stack.sh` — CI smoke test: bring up the stack, curl `/health` on backend, curl `/healthz` on frontend, curl `/api/agents` through the nginx proxy, tear down.

The CI `docker` job builds the backend + frontend images on every PR and runs the smoke test. We do **not** push to a registry. We do **not** include production auth, TLS, or a multi-tenant stack. The deploy workflow (`.github/workflows/deploy.yml`) targets Railway + Vercel; production deployment is a separate decision.

## What we deliberately don't ship

- **A Kubernetes chart.** The FDE picks the orchestrator per customer. We don't pre-judge.
- **A Helm template.** Same.
- **A Terraform module.** Same.
- **A production database (RDS, Cloud SQL).** Same.
- **A multi-tenant auth layer.** Out of scope. The FDE adds auth before deploying.
- **TLS termination.** Out of scope. The FDE terminates at the edge (Cloudflare, Vercel, ALB).
- **A registry push.** We build images in CI for smoke testing only. The deploy workflow is the production path.

## Why per-service Dockerfiles, not a single monorepo Dockerfile

A single `Dockerfile` that builds the whole monorepo is a footgun: every change rebuilds the world, the image is large, and the layers don't compose with the workspace structure. Per-service Dockerfiles mean:
- The backend image only depends on the backend's transitive deps.
- The frontend image only depends on the frontend's Vite build.
- The Python sidecar image only depends on the Python package.
- CI can build them in parallel.
- An FDE can swap any one for a customer's preferred runtime (e.g. a customer's existing nginx for the frontend) without rebuilding the rest.

The trade-off is that `docker-compose.yml` has more services. That's the right cost.

## Healthchecks

Every service exposes a `/health` or `/healthz` endpoint:
- `backend`: `GET /health` returns `{ status: "ok" }`.
- `frontend` (nginx): `GET /healthz` returns `200 ok\n`.
- `agents-python`: `GET /healthz` returns `{ status: "ok", service: "techtideai-python-sidecar" }`.

`depends_on: condition: service_healthy` ensures the stack comes up in dependency order, not in file order. This is a small thing that makes local dev dramatically less frustrating.

## Consequences

Positive:

- A new contributor can `docker compose up --build` and have the whole stack running in under five minutes.
- The smoke test catches `Dockerfile` regressions on every PR.
- The local stack matches the production deploy workflow's shape (per-service, healthchecked) without imposing production's choices.

Negative:

- The smoke test is slow. ~3-5 minutes of build time. Mitigated by the `paths-filter` (only runs on Docker-related changes).
- Production deployment is a separate decision the FDE has to make. That's the right separation, but it means "production deploy" is not a one-liner from this repo.

## Alternatives considered

- **A single monorepo Dockerfile.** Rejected: image bloat, no layer sharing, every change rebuilds the world.
- **A Kubernetes + Helm chart out of the box.** Rejected: pre-judges the customer's orchestrator.
- **A "production" compose file with auth + TLS + registry push.** Rejected: scope creep. The PDF is right that containerization matters, but production is a different decision than local dev.
