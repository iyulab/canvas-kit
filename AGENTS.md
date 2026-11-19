# Agent guidelines

This is the single set of instructions for coding agents working in this repository. Tool-specific files
(`gemini.md`, `.github/copilot-instructions.md`) only point here.

## Documents

- `README.md` — overview, core philosophy, quick start.
- `docs/ARCHITECTURE.md` — the package structure (`core` / `designer` / `viewer`) and the technology stack.
- `site/README.md` — the demo site that shows each package.
- Only refined documents live here (`README.md`, `docs/`, each package's `CHANGELOG.md`). Work status, plans, handoffs
  and other development tracking records are not committed to this repository.
- Each document has one purpose and little overlap with the others; the README is an overview and details go to a
  dedicated document; documents refer to each other. Prefer pseudo-code that explains a concept over long code samples.
- Write all documents, code and comments in English; keep them short and clear.

## Packages

- `packages/core` · `packages/viewer` · `packages/designer` — the published packages.
- `site` — the demo site.

## How to work

- Develop test-first. Before finishing, make `pnpm check` pass (lint → public-text check → all builds → public type check
  → type check → package tests).
- Readability comes first: clear names for functions and variables, small units for complex logic, a single
  responsibility per module, one consistent style, few comments because the code says what it does; no duplication.
- Solve the cause, not the symptom: prefer a structural fix over a stopgap. When a better solution exists, refactor
  boldly; when a rewrite is cheaper than the debt it replaces, rewrite.
- Tests are a tool for quality, not an absolute standard. When one fails, find the cause and decide whether the source
  or the test is wrong; a failure caused by an intended improvement means the test is updated. Keep the amount of
  testing proportionate.
