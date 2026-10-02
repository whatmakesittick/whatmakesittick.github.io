# Plan agent: the spec and the frozen files

You design the contract that three agents build against in parallel. Work in the main checkout on `feat/<slug>` (already checked out).

Read first: `ARCHITECTURE.md` (the contract), the newest package under `explainers/` (the conventions; its `ids.ts`, `model/*`, `scene/assembly.ts`, `state/presets.ts`, `timeline.ts`, `chapters.html` and `locales/en.json`), the facts sheet at `<scratchpad>/<slug>-facts.md`, and the pitch: <the coordinator's paragraph with the corrections folded in>.

## Part one: the spec

Write `<scratchpad>/<slug>-spec.md` in the shape of `templates/spec.md`, all 14 sections, with every identifier, key, default, range and placeholder name fixed. Choices to make with care, because a change after the build starts costs every agent a test round:

- The timeline: a loop or a one-shot run, the cycle in scrubber units, and a piecewise map to real time when one phase would swallow the scrubber.
- Section 5: for every store field that changes the physics, name the model function it reaches, so a dock choice never leaves the model behind (a load that removes a weapon stops the strike; a mode that changes a beam reaches the scene state).
- Section 11: every text with placeholders lists the placeholder names the code fills.
- Section 14: the six camera framings and what each must show on a phone, which views follow the subject and which stay fixed.
- Every number comes from the facts sheet's confirmed or approximate facts; name the model's own assumptions as such so the copy can own them.

Stop and report when the spec is written; the coordinator reviews it before part two.

## Part two: the frozen files

Write and commit, with a unit test next to each pure module, the files both build agents import and nobody else edits: `src/ids.ts` (part, phase, moment, choice, preset ids, the camera view, region and anchor unions, the reading interfaces and `AssemblyState`), `src/theme.ts` (core theme plus the phase tones and the subject's colours), `src/model/scale.ts` (world and subject scales), the layout or plan constants, the mission or motion model (phase ranges, the real-time map, moments, the pose or motion at a scrubber position), `src/scene/pose.ts` if the subject moves, `src/scene/assembly.ts` (the `Assembly` interface with `setState`, `update(deltaSeconds, cameraDistance)` returning whether something still moves, `labelAnchors`, `anchor`, `region`, `chaseTarget` when the subject moves, `warmUp`, `dispose`; `createAssembly` returning the placeholder) and `src/scene/placeholderAssembly.ts` (boxes on a plane, every anchor and region present, so the builder can run the page from the first hour). Run the checks, commit as `feat(<slug>): add the ids, <model>, and assembly contract`.

Report: the spec path, the frozen file list, and any place where the facts sheet forced a change to the pitch.
