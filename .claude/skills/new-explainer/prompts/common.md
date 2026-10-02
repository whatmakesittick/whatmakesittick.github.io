# Rules for every agent (paste at the top of each prompt)

- Node: run `source ~/.nvm/nvm.sh && nvm use` (version from `.nvmrc`) before any npm or npx command.
- Git: work only in the checkout and branch named in your brief. Never push, rebase, cherry-pick, switch branches or touch the stash. Atomic conventional commits (`feat(<slug>): …`, `fix(<slug>): …`, `test(<slug>): …`), no trailers, no co-authors, no "Generated with" lines. Commit only the files you own.
- Frozen files (`ids.ts`, `theme.ts`, the frozen `model/*` modules, `scene/assembly.ts`, `scene/pose.ts`) are never edited. If one blocks you, work around it locally without committing the frozen change and describe the needed change in your report.
- Code: no comments (one short line only for a non-obvious external constraint), no all-caps words in strings, named constants, small functions, no magic numbers. Copy existing patterns from the newest explainer; use the core helpers before writing your own.
- Checks before every commit: `npx prettier --write <paths>`, `npx eslint <paths>`, `npx tsc --noEmit -p tsconfig.json`, `npx vitest run explainers/<slug>`.
- Browser scripts: they must live inside the repository to import `@playwright/test`, under `e2e/.tmp/` (never committed), with chromium args `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. Take viewport screenshots only; full-page screenshots fail on a WebGL page. Save screenshots to the scratchpad folder named in your brief.
- Leave the checkout clean when you report: nothing untracked, no preview package, no scripts under `e2e/.tmp/`, no dev server running. Every helper agent you started has finished.
- Final report: at most 30 lines, in three parts: what changed (files, commits), deviations from the spec, what the coordinator must do (frozen-file changes, keys the writer must add, decisions). Never paste file contents or screenshots into the report; give paths.
