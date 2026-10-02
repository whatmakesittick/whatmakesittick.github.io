---
name: new-explainer
description: Build a new explainer end to end - a sourced facts sheet, a shared spec with frozen contract files, a modeller, a builder and a writer working in parallel, a review and fix round, integration, images, browser QA and the PR.
---

# New explainer

One session coordinates; agents do the work in the background. Each step names the prompt file to send; the coordinator fills in the slug, the subject, the paths and anything the earlier steps decided. Every prompt starts with `prompts/common.md`. Read `prompts/` and `templates/` from this folder, never a package or `ARCHITECTURE.md` yourself: the agents read those.

Rules for the coordinator: read only the "Corrections" and "Safe numbers" sections of the facts sheet; review screenshots as one contact sheet per device, opened once; keep every agent's report under 30 lines; stop every agent when its work is done and check `ListAgents` before the final message; stale worktrees from an earlier build are the user's to remove.

## Steps

1. **Pitch.** Agree the subject with the user in one paragraph: the angle, what the timeline measures and its phases, six chapters, the widgets and dock choices, the tags from `src/core/manifest.ts`, the main design risk.
2. **Facts.** Spawn a research agent with `prompts/researcher.md`; it fills `templates/facts.md` in the session scratchpad. Fold its corrections into the pitch.
3. **Spec and frozen files.** Spawn a Plan agent with `prompts/plan.md`; it drafts the spec from `templates/spec.md` next to the facts sheet. Review the spec, then let the same agent write and commit the frozen files with their tests on `feat/<slug>`.
4. **Build.** Create `../wt-<slug>-scene` and `../wt-<slug>-copy` from `feat/<slug>` (`git worktree add`, then `npm ci` in each), add `explainers/<slug>/chapters.html` and `explainers/<slug>/locales/` to `.git/info/exclude`, then spawn in parallel the modeller (`prompts/modeller.md`, scene worktree), the builder (`prompts/builder.md`, main checkout) and the writer (`prompts/writer.md`, copy worktree). Within the first hour check the modeller's handedness screenshots against the real thing and the builder's phone contact sheet of the six views. When a frozen file must change, change it yourself, commit, and tell the agents.
5. **Review.** When the builder and writer finish, merge the copy (rebase `feat/<slug>-copy` onto `feat/<slug>`, remove the exclude lines, fast-forward), copy the writer's English `meta.socialAlt` into `explainer.json`, then spawn a read-only reviewer with `prompts/reviewer.md`. Split its findings: a fixer agent (`prompts/fixer.md`) takes the code items, the resumed writer takes the copy items, you take the frozen files.
6. **Integrate.** Rebase `feat/<slug>-scene` onto `feat/<slug>` and fast-forward it in. Point `createAssembly` at the real assembly, delete the placeholder, re-export the modeller's `SCENE_OPTIONS` from `scene/index.ts`, call its lighting with a restore on unmount, run the type check and the package tests, commit.
7. **Images.** With the dev server on port 5180: `node e2e/tools/cover.ts <slug> <phase> cover.png`, then `cwebp -q 85 -resize 932 699 cover.png -o explainers/<slug>/public/cover.webp`. Copy `meta.tagline` from `locales/en.json` into `scripts/cards/<slug>.html`, run `bash scripts/social-images.sh <slug>`. Look at both once, commit.
8. **Browser QA.** `SLUG=<slug> QA_OUT=<dir> npx playwright test --config=e2e/tools/qa.config.ts`, then `node e2e/tools/contact.ts <dir> <sheet.png> <prefix>` per device. Check the chips and sliders by hand on the page. Send the sheets to the user. Resume the writer for one native-reader pass per language (`prompts/writer.md`, final section) and merge it the same way as in step 5.
9. **Finish.** `npm run lint`, `npm test`, `npm run build` (not while the QA walk runs). Open the PR with the `/pr` skill. After the merge, ask the user to delete the worktrees and branches.
