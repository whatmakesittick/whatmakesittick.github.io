# Working in this repository

- Node: `source ~/.nvm/nvm.sh && nvm use` before any npm command; the version comes from `.nvmrc`.
- Read `ARCHITECTURE.md` before touching `src/core` or adding an explainer; it is the contract.
- Before every commit: `npx prettier --write <paths>`, `npx eslint <paths>`, `npx tsc --noEmit -p tsconfig.json`, `npx vitest run <paths>`. Before a PR: `npm run lint`, `npm test`, `npm run build`.
- The build runs the site check in `vite/siteCheck.ts`: description limits per language, the JavaScript budget, the head tags and the crawl files. When it fails, fix the page, not the rule.
- Explainers are folders under `explainers/<slug>/`; the newest one is the reference for conventions. Copy an existing explainer, do not invent new patterns when the core has a helper.
- Every number in an explainer's copy comes from a sourced facts sheet written for that explainer, never from memory.
- Copy reads naturally in every language, as a native reader would write it, and is easy to follow: short sentences, everyday words, one idea per sentence, the same warm second-person voice in each translation. No em or en dashes as sentence punctuation in any language; use commas, colons or a new sentence.
- To build a new explainer, use the `new-explainer` skill in `.claude/skills/`.
- When coordinating an explainer build, never read a whole package, `ARCHITECTURE.md` or a locale file yourself: delegate the reading and the drafting, read the agents' reports, run the checks.
- Review screenshots as one contact sheet per device (`e2e/tools/contact.ts`), not one file at a time.
- Git: feature branches, atomic conventional commits, no comments in code, no all-caps words in text, never push to main, PRs are squash-merged.
