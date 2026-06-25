# Contributing to TechTideAI

Thanks for your interest in TechTideAI. This document explains how to propose changes, the quality bar we hold ourselves to, and the workflow we expect from PRs.

## Quick Links

- [Code of Conduct](#code-of-conduct)
- [What we work on](#what-we-work-on)
- [Development setup](docs/DEV_SETUP.md)
- [Quality gates](docs/QUALITY_GATES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Architecture decisions](docs/adr/)
- [Eval methodology](docs/EVALS.md)

## Code of Conduct

We are committed to a respectful, professional environment. Be kind. Assume good faith. Disagree on substance, not on people.

## What we work on

TechTideAI is a **company-scale agent operating system**. The bar for a change is:

- **Typed contracts over prompt soup.** Public surfaces have Zod / Pydantic schemas.
- **Logs and traces over vibes.** Every important decision leaves an audit record.
- **Human approval where risk matters.** High-risk actions route through the approval gate.
- **Evidence records for every important decision.** `run_events` is the system of record.
- **Small, reviewable changes over giant unowned drops.** PRs should be mergeable in one sitting.

If your change doesn't fit one of these surfaces, control plane, execution plane, evidence plane, or product plane, open an issue first.

## Development workflow

### 1. Branch off `main`

```powershell
git checkout main
git pull
git checkout -b <scope>/<short-description>
```

Use a Conventional Commit scope in the branch name (`agents/`, `backend/`, `frontend/`, `apis/`, `evals/`, `docs/`, `infra/`).

### 2. Make the change

- Match the surrounding code's idioms, comment density, and naming.
- Keep PRs focused. If a fix surfaces an unrelated cleanup, file a follow-up issue.
- New types go in `backend/src/domain/entities/`.
- New business rules go in `backend/src/domain/policies/` and use the OCP-friendly `extend()` pattern.
- New scorers register themselves with the `ScorerRegistry`.
- New golden tasks go in `evals/fixtures/` and follow the schema documented in `evals/fixtures/README.md`.

### 3. Run the verify gate

```powershell
pnpm install
pnpm run verify
```

`pnpm run verify` runs lint + test + build across every TypeScript workspace. PRs that don't pass `verify` will not be merged.

For Python changes:

```powershell
cd agents/python
python -m pip install -e .[dev]
python -m pytest
python -m ruff check .
python -m ruff format --check .
```

### 4. Open a PR

- Use the [PR template](.github/pull_request_template.md).
- PR title must follow Conventional Commits (`feat(agents): add cipher orchestrator graph`).
- Link to the issue or ADR that motivates the change.
- If your change touches eval fixtures, expect a maintainer to ask about regression impact against the baseline in `docs/EVALS/latest.json`.

### 5. Code review

- The CI Gate is the only required check. The ruleset on `main` (id `12503875`) requires `CI Gate` (which runs `pnpm run verify` and the Python pytest + ruff suite) and zero approving reviews. CODEOWNERS is informational on this repo.
- A maintainer reviews on the cadence of the change: a one-line doc fix lands on first review; an eval-regenerating prompt change gets the eval harness maintainer plus the relevant orchestrator owner.
- Reviewers will check: contracts, tests, audit records, and (where applicable) eval impact.

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug.yml). Include:

- A minimal reproduction.
- The output of `pnpm run verify` on a clean checkout.
- The relevant `run_id` from `/api/runs` if the bug involves agent execution.

## Reporting an eval result

If you ran the eval suite locally and got different numbers than `docs/EVALS/latest.json`, use the [eval result template](.github/ISSUE_TEMPLATE/eval-result.yml). Include:

- The command you ran.
- The full stdout from `pnpm -C backend evals --suite golden-tasks.v1`.
- Your model version, scorer version, and any environment notes.

## Proposing features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature.yml). Before opening a feature request, please skim the ADRs in `docs/adr/`, many "ideas" are already filed as decisions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
