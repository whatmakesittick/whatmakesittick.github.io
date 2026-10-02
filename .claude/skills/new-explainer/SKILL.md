---
name: new-explainer
description: Build a new explainer end to end - a sourced facts sheet, a shared spec with frozen contract files, a modeller, a builder and a writer working in parallel, a review and fix round, integration, images, browser QA and the PR.
---

# New explainer

One session coordinates; agents do the wide work in the background and in parallel where the ownership table allows. The order is fixed: facts before the spec, the spec before any build, review before integration, QA before the PR. Use the newest package under `explainers/` as the reference for conventions, and `ARCHITECTURE.md` for the contract. Stop every agent when its work is done.

## Coordinator budget

The coordinator's context is the scarce resource. It never reads a whole package, `ARCHITECTURE.md` or a locale file itself: it delegates reading and drafting, reads reports and runs checks. Rules that keep a build under control:

- Every agent prompt caps the final report at 30 lines, in the shape "what changed, deviations, what the coordinator must do", and never pastes file contents or screenshots back.
- The coordinator reads only two sections of the facts sheet, "Corrections to the brief" and "Safe numbers for the copy"; the agents read the rest.
- Screenshots are reviewed as one contact sheet per device (`e2e/tools/contact.ts`), opened once; a single screenshot is opened only to confirm a specific fix.
- Every agent that works in a worktree leaves it clean: no preview package, no scripts under `e2e/.tmp/`, nothing untracked when it reports.
- Stale worktrees from an earlier explainer are the user's to remove: `git worktree remove` is blocked for the coordinator, so name them in the final message instead of retrying.

## 1. Pitch

Agree the subject with the user before any work. The pitch names the subject and the angle in one paragraph; what the timeline measures (an angle, a distance along a path, seconds, metres of depth) and its phases; six chapters; the widgets and dock choices; the tags from `src/core/manifest.ts`; and the main design risk (scale, visibility, a loop with no natural cycle). One story, honest physics.

## 2. Facts

Spawn a research agent that writes a facts sheet with WebSearch and WebFetch. Keep the sheet as a working document outside the repository, in the session scratchpad. Its shape:

- a header defining the confidence labels: confirmed, approximate, disputed, unverified
- numbered sections of one-to-four-line facts, each with a source link and a label, derived arithmetic shown
- "Corrections to the brief": what the pitch got wrong
- "Safe numbers for the copy": a table of fact, value to quote, confidence
- "Things the copy must not say": common misconceptions

Prefer primary sources. A number that cannot be found is labelled unverified, never guessed. Read the corrections and the safe numbers and fold the corrections into the pitch before the spec is written.

## 3. Spec and frozen files

Spawn a Plan agent that reads `ARCHITECTURE.md`, the newest package and the facts sheet and drafts the spec as a working document next to the facts sheet, with these sections:

1. identity: slug, tags, title, subject, what the model shows and how it is simplified
2. the timeline: phase ids, ranges, tones, the speed scale, format keys
3. the plan or geometry constants both build agents rely on
4. the physics model: modules, formulas, named constants taken from the facts sheet
5. store fields with defaults and ranges, and for each field that changes the physics, the model function it reaches (a load that removes a weapon must stop the strike; a mode that changes a beam must reach the scene state)
6. presets: camera view, speed, view flags, seek, labels on, highlight, per chapter
7. dock choices, toggles and readouts
8. part ids and label keys
9. chapter actions
10. chapter widgets as exact markup
11. the complete locale key list, including `meta.description` and `meta.socialAlt`, and for every text with placeholders the placeholder names the code will fill
12. the chapter outline for the writer
13. the assembly contract
14. scene notes, including the camera framings and what each must show on a phone

Every identifier and i18n key is fixed in the spec, so agents never have to agree on names. The coordinator reviews the spec, then the same agent writes and commits the files both build agents import and nobody else edits: the ids file (part, region, anchor, choice and section ids, view flags, the assembly state), the plan or layout constants with tests, the scale or coordinate mapping with tests, the mission or motion model with tests, the theme, and the assembly module with the `Assembly` interface, a `createAssembly` factory and a crude placeholder implementation so the builder can run the page from the first hour. The coordinator runs the package tests before committing. A frozen change after the build has started costs a test round in every agent, so the spec review checks section 5 with care.

## 4. Build in parallel

| Agent    | Where                                                     | Owns                                                                                                                                                                                                                       |
| -------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modeller | worktree `../wt-<slug>-scene`, branch `feat/<slug>-scene` | the assembly implementation, `src/scene/parts/**`, `geometry/**`, `finishes.ts`, `constants.ts`, `regions.ts`, `sceneOptions.ts`, `lighting.ts`                                                                            |
| Builder  | main checkout, branch `feat/<slug>`                       | `src/index.ts`, `timeline.ts`, `model/**`, `state/**`, `ui/**`, `style.css`, `scene/index.ts`, `controller.ts`, `bindings.ts`, `cameraViews.ts`, `partInfo.ts`, `explainer.json`, `public/**`, `scripts/cards/<slug>.html` |
| Writer   | worktree `../wt-<slug>-copy`, branch `feat/<slug>-copy`   | `chapters.html`, `locales/*.json` in all eight languages                                                                                                                                                                   |

Create the worktrees from the feature branch after the frozen files are committed and run `npm ci` in each. Add the writer's two paths to `.git/info/exclude` so the builder can keep temporary copies of `chapters.html` and `locales/en.json` untracked; tell the writer to stage with `git add -f`. Remove the exclude lines at integration. The modeller views its work through a throwaway preview package it never commits and deletes before it reports.

Every agent prompt states: the Node version from `.nvmrc` through `nvm use`; never push, rebase or touch the stash; atomic conventional commits without trailers; no comments; no all-caps words; named constants and small functions; the checks to run before each commit; a clean worktree at the end; report every deviation from the spec in a final message of at most 30 lines. The writer's prompt adds the copy rules from `CLAUDE.md`: natural, easy-to-follow text in every language and no dashes as punctuation, with a per-language native-reader pass and a dash count before the final commit, and the builder's note on which placeholders each text receives. It also sets the page head rules: `meta.description` fits a search result, at most 155 characters (80 in zh, 100 in ja), and every locale ships `meta.socialAlt`, the `social.alt` from `explainer.json` verbatim in English and translated elsewhere with that locale's `meta.title`. The modeller's prompt adds the rendering contract from `ARCHITECTURE.md`: the core draws on demand, so a frame update returns `true` while something it draws keeps moving on its own, and a scene that changes outside a frame and outside the store calls `invalidate()`, and asks for label anchors parented under the object that hides with the part, so a hidden part hides its label. When a frozen file must change, the coordinator changes it and tells the agents, because agents cannot rebase or cherry-pick from their sandboxes.

Two early checks, both within the first hour:

- Handedness: ask the modeller for one screenshot from each side and check against the real thing (which side a crown, a door or a control sits on when seen from the front, which way each part turns), because a mirrored layout found at the end costs a whole modelling round.
- Framing: ask the builder for a phone contact sheet of the six chapter views with the placeholder boxes, and fix any view where the subject is too small, cut off or hidden by the gauge or the dock, because a framing found in the final QA costs a round of scene screenshots.

## 5. Review and fixes

When the builder and writer finish, spawn a read-only reviewer over the package and the copy: physics against the facts sheet, the contract, widgets, accessibility, locales, how naturally each translation reads, its dash count and its description lengths, and the canvases from screenshots. Split its findings: a fixer agent takes the code items in the main checkout; the writer, resumed, takes the copy items in its worktree; the coordinator takes the frozen files. Nobody else edits `chapters.html` or the locales, so the two never collide.

Before the PR, the writer runs one more native-reader pass with one subagent per language, each rewriting its locale from the English meaning as a native writer would, never sentence by sentence, while the writer alone commits.

## 6. Integrate

Rebase each worktree branch onto the feature branch and fast-forward it in (the coordinator only; rebase again if the branch moved). Switch `createAssembly` to the real assembly, delete the placeholder, re-export the modeller's scene options from `scene/index.ts`, wire its lighting with a restore on unmount, then run the type check and the package tests.

## 7. Images

The scripts live in `e2e/tools/` and take the slug, so nothing is rewritten per explainer. Cover: `node e2e/tools/cover.ts <slug> <phase> <out.png>` against the dev server takes the stage at 1600 × 900 and device scale 2 with the gauge, the labels, the dock and the expand button hidden, clipped to 4:3 inside the stage; then `cwebp -q 85 -resize 932 699` into `public/cover.webp`. Link preview: copy `meta.tagline` from `locales/en.json` into `scripts/cards/<slug>.html`, then `bash scripts/social-images.sh <slug>`. Look at both once before committing.

## 8. Browser QA

Run the dev server and `SLUG=<slug> QA_OUT=<dir> npx playwright test --config=e2e/tools/qa.config.ts`: it walks the six chapters at their seek points on desktop 1440 × 900 and iPhone 13 with a coarse pointer, in English and two other languages, with software WebGL, and checks no page or console errors, no untranslated keys, no labels over the dock, no empty readouts, readouts that change with the scrubber and no horizontal overflow, saving one screenshot per chapter. Chips and sliders are checked by hand on the page or with a short extra spec for that explainer. Full-page screenshots fail on a WebGL page under software rendering, so the tools take viewport shots only. Build one contact sheet per device with `node e2e/tools/contact.ts <dir> <out.png> <prefix>`, look at each once, and send them to the user. Run the full build at a different time than the QA walk: both on the same machine made the walk flaky once.

## 9. Finish

`npm run lint`, `npm test`, `npm run build`. Move anything left under `e2e/.tmp/` out of the repository first, since lint covers it. Open the PR with the `/pr` skill. PRs are squash-merged, so worktree branches are not ancestors of main afterwards: after the merge, ask the user to delete the worktrees and local branches, pull main and check the live pages.
