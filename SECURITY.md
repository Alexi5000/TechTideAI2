# Security Policy

TechTideAI takes the security of its agent runtime, APIs, and data plane seriously. This document explains how to report a vulnerability and which versions are supported.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :white_check_mark: (security fixes only) |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email: `security@techtide.ai` (PGP key on request). If email is not possible, open a [private security advisory](https://github.com/Alexi5000/TechTideAI2/security/advisories/new) on GitHub.

Include:

- A description of the vulnerability and the impact.
- Reproduction steps or a proof-of-concept.
- The version affected.
- Any mitigations you've already considered.

We aim to:

- Acknowledge within 3 business days.
- Triage and assign a CVSS-style severity within 7 days.
- Ship a fix or a documented mitigation within 30 days for high-severity issues.

## Security Posture

TechTideAI is a research / portfolio system. **Do not deploy it against production data without a security review.** Specifically:

- Auth is not implemented. Routes trust the upstream gateway.
- The Mastra agent runtime executes tool calls without sandboxing by default.
- The approval gate is the recommended mitigation for high-risk actions; configure your deployment to require it.
- Provider API keys must never be committed. Use `.env` (gitignored) or a secret manager.

## Secrets Hygiene

- `.env`, `.env.*`, and any file matching `*.env` are gitignored.
- `backend/.env.example`, `frontend/.env.example`, `agents/.env.example`, `agents/python/.env.example` are the canonical templates — keys go there with placeholder values, never real ones.
- CI uses stub keys (`sk-stub-for-ci`); the verify gate is safe to run on forks.

## Dependency Hygiene

We use Dependabot with monthly grouping and auto-merge for `build(deps)` PRs after CI green. If you suspect a supply-chain issue, open a security advisory.
