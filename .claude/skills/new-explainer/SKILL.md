---
name: new-explainer
description: Build a new explainer end to end - a sourced facts sheet, a shared spec with frozen contract files, a modeller, a builder and a writer working in parallel, a review and fix round, integration, images, browser QA and the PR.
---

# New explainer

One session coordinates; agents do the wide work in the background and in parallel where the ownership table allows. The order is fixed: facts before the spec, the spec before any build, review before integration, QA before the PR. Use the newest package under `explainers/` as the reference for conventions, and `ARCHITECTURE.md` for the contract. Stop every agent when its work is done.

## 1. Pitch

Agree the subject with the user before any work. The pitch names the subject and the angle in one paragraph; what the timeline measures (an angle, a distance along a path, seconds, metres of depth) and its phases; six chapters; the widgets and dock choices; the tags from `src/core/manifest.ts`; and the main design risk (scale, visibility, a loop with no natural cycle). One story, honest physics.

## 2. Facts

Spawn a research agent that writes a facts sheet with WebSearch and WebFetch. Keep the sheet as a working document outside the repository, in the session scratchpad. Its shape:

- a header defining the confidence labels: confirmed, approximate, disputed, unverified
- numbered sections of one-to-four-line facts, each with a source link and a label, derived arithmetic shown
- "Corrections to the brief": what the pitch got wrong
- "Safe numbers for the copy": a table of fact, value to quote, confidence
- "Things the copy must not say": common misconceptions

Prefer primary sources. A number that cannot be found is labelled unverified, never guessed. Read the sheet and fold its corrections into the pitch before writing the spec.

## 3. Spec and frozen files

Write the spec as a working document next to the facts sheet, with these sections:

1. identity: slug, tags, title, subject, what the model shows and how it is simplified
2. the timeline: phase ids, ranges, tones, the speed scale, format keys
3. the plan or geometry constants both build agents rely on
4. the physics model: modules, formulas, named constants taken from the facts sheet
5. store fields with defaults and ranges
6. presets: camera view, speed, view flags, seek, labels on, highlight, per chapter
7. dock choices, toggles and readouts
8. part ids and label keys
9. chapter actions
10. chapter widgets as exact markup
11. the complete locale key list, including `meta.description` and `meta.socialAlt`
12. the chapter outline for the writer
13. the assembly contract
14. scene notes

Every identifier and i18n key is fixed in the spec, so agents never have to agree on names. Then write and commit the files both build agents import and nobody else edits: the ids file (part, region, anchor, choice and section ids, view flags, the assembly state), the plan or layout constants with tests, the scale or coordinate mapping with tests, the theme, and the assembly module with the `Assembly` interface, a `createAssembly` factory and a crude placeholder implementation so the builder can run the page from the first hour.

## 4. Build in parallel

| Agent    | Where                                                     | Owns                                                                                                                                                                                                                       |
| -------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modeller | worktree `../wt-<slug>-scene`, branch `feat/<slug>-scene` | the assembly implementation, `src/scene/parts/**`, `geometry/**`, `finishes.ts`, `constants.ts`, `regions.ts`, `sceneOptions.ts`, `lighting.ts`                                                                            |
| Builder  | main checkout, branch `feat/<slug>`                       | `src/index.ts`, `timeline.ts`, `model/**`, `state/**`, `ui/**`, `style.css`, `scene/index.ts`, `controller.ts`, `bindings.ts`, `cameraViews.ts`, `partInfo.ts`, `explainer.json`, `public/**`, `scripts/cards/<slug>.html` |
| Writer   | worktree `../wt-<slug>-copy`, branch `feat/<slug>-copy`   | `chapters.html`, `locales/*.json` in all eight languages                                                                                                                                                                   |

Create the worktrees from the feature branch after the frozen files are committed and run `npm ci` in each. Add the writer's two paths to `.git/info/exclude` so the builder can keep temporary copies of `chapters.html` and `locales/en.json` untracked; tell the writer to stage with `git add -f`. Remove the exclude lines at integration. The modeller views its work through a throwaway preview package it never commits.

Every agent prompt states: the Node version from `.nvmrc` through `nvm use`; never push, rebase or touch the stash; atomic conventional commits without trailers; no comments; no all-caps words; named constants and small functions; the checks to run before each commit; report every deviation from the spec in the final message. The writer's prompt adds the copy rules from `CLAUDE.md`: natural, easy-to-follow text in every language and no dashes as punctuation, with a per-language native-reader pass and a dash count before the final commit. It also sets the page head rules: `meta.description` fits a search result, at most 155 characters (80 in zh, 100 in ja), and every locale ships `meta.socialAlt`, the `social.alt` from `explainer.json` verbatim in English and translated elsewhere with that locale's `meta.title`. The modeller's prompt adds the rendering contract from `ARCHITECTURE.md`: the core draws on demand, so a frame update returns `true` while something it draws keeps moving on its own, and a scene that changes outside a frame and outside the store calls `invalidate()`. When a frozen file must change, the coordinator changes it and tells the agents, because agents cannot rebase or cherry-pick from their sandboxes. In the first hour, ask the modeller for one screenshot from each side and check handedness against the real thing (which side a crown, a door or a control sits on when seen from the front, which way each part turns), because a mirrored layout found at the end costs a whole modelling round.

## 5. Review and fixes

When the builder and writer finish, spawn a read-only reviewer over the package and the copy: physics against the facts sheet, the contract, widgets, accessibility, locales, how naturally each translation reads, its dash count and its description lengths, and the canvases from screenshots. Split its findings: a fixer agent takes the code items in the main checkout; the writer, resumed, takes the copy items in its worktree; the coordinator takes the frozen files. Nobody else edits `chapters.html` or the locales, so the two never collide.

## 6. Integrate

Rebase each worktree branch onto the feature branch and fast-forward it in (the coordinator only; rebase again if the branch moved). Switch `createAssembly` to the real assembly, delete the placeholder, re-export the modeller's scene options from `scene/index.ts`, wire its lighting with a restore on unmount, then run the type check and the package tests.

## 7. Images

Cover: a Playwright shot of the stage at 1600 × 900 and device scale 2 with the gauge hidden (`[data-gauge]{display:none}`), clipped to 4:3, then `cwebp -q 85 -resize 932 699` into `public/cover.webp`. Link preview: `bash scripts/social-images.sh <slug>` renders `scripts/cards/<slug>.html`. Look at both before committing.

## 8. Browser QA

Run the dev server and a Playwright script that walks the six chapters at their seek points on desktop 1440 × 900 and iPhone 13 with a coarse pointer, in English and two other languages, with chromium args `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. Check: no page or console errors, no untranslated keys, no labels over the dock, readouts that change with the scrubber, sliders and chips that change their readouts, no horizontal overflow. Build contact sheets and look at them, then send them to the user.

## 9. Finish

`npm run lint`, `npm test`, `npm run build`. Open the PR with the `/pr` skill. PRs are squash-merged, so worktree branches are not ancestors of main afterwards: after the merge, delete the worktrees and local branches, pull main and check the live pages.
