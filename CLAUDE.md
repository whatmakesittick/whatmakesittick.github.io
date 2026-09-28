# Working in this repository

- Node 24: `source ~/.nvm/nvm.sh && nvm use 24` before any npm command.
- Read `ARCHITECTURE.md` before touching `src/core` or adding an explainer; it is the contract.
- Before every commit: `npx prettier --write <paths>`, `npx eslint <paths>`, `npx tsc --noEmit -p tsconfig.json`, `npx vitest run <paths>`. Before a PR: `npm run lint`, `npm test`, `npm run build`.
- Explainers are folders under `explainers/<slug>/`; the newest one is the reference for conventions. Copy an existing explainer, do not invent new patterns when the core has a helper.
- Every number in an explainer's copy comes from a sourced facts sheet written for that explainer, never from memory.
- To build a new explainer, use the `new-explainer` skill in `.claude/skills/`.
- Git: feature branches, atomic conventional commits, no comments in code, no all-caps words in text, never push to main, PRs are squash-merged.
