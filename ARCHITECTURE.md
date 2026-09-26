# Architecture

One website, many explainers, one repository. `src/core` is the app: the page
shell, the 3D toolkit, the store contract, translations plumbing and the build.
`src/site` is the catalogue. An explainer is a content package under
`explainers/<slug>/`, built into a page at `/<slug>/`.

## Repository layout

| Path | Owns |
| --- | --- |
| `index.html`, `src/site/` | Catalogue page: cards per explainer grouped by category, language dropdown |
| `src/core/` | Everything an explainer builds on (see below) |
| `src/core/page.html` | The explainer page template: masthead, stage, gauge, dock, prose column, footer |
| `src/core/locales/*.json` | Shell strings only: controls, footer, header chrome, keyboard, catalogue |
| `explainers/<slug>/` | One folder per explainer, see "Explainer package" |
| `scripts/` | Social images and other tooling |
| `.github/workflows/` | `ci.yml` on pull requests, `deploy.yml` on `main` |

Generated at build and dev time, never committed: `<slug>/index.html` and
`<slug>/main.ts` for every explainer, produced by the `explainerPages` Vite plugin
from `src/core/page.html` and the explainer manifest. Each generated folder gets a
`.gitignore` containing `*`.

## Explainer package

```
explainers/engine/
  explainer.json      slug, category, cover, entry, chapters, locales
  chapters.html       the prose column: <section class="chapter" data-preset="…"> blocks
  locales/en.json …   everything the explainer says, including meta.title, meta.eyebrow,
                      meta.tagline, meta.description, meta.summary
  src/index.ts        export default defineExplainer({ … })
  src/model/          pure simulation, unit tested
  src/scene/          part geometry, assembly, controller, camera views, store bindings
  src/ui/             widgets used inside chapters (diagrams, dial, sliders)
  public/             cover image and other static files, served under /<slug>/
```

The explainer imports the toolkit through the `@core/*` alias, which resolves to
`src/core/*`. Explainers carry no tooling of their own; the repository's lint,
tests and build cover them.

## Contract

`src/core/explainer.ts` defines it. The shape that matters:

```ts
interface PlaybackState {
  phase: number;            // position in the cycle, 0 ≤ phase < timeline.cycle
  playing: boolean;
  speed: number;            // in the explainer's speed unit, e.g. rpm
  preset: string;
  pausedByPreset: boolean;
  cameraResetToken: number;
  view: Record<string, boolean>;
}

interface PlaybackActions {
  tick(deltaSeconds: number): void;
  setPhase(phase: number): void;
  step(delta: number): void;
  play(): void; pause(): void; togglePlaying(): void;
  setSpeed(speed: number): void;
  setView(view: Record<string, boolean>): void;
  toggleView(key: string): void;
  applyPreset(id: string): void;
  resetCamera(): void;
}

interface Timeline {
  cycle: number;                      // 720 for a four-stroke engine
  step: number;                       // scrubber step
  labelKey: string;                   // "Crank angle"
  formatPhase(phase: number): string; // "402°"
  rate(speed: number): number;        // phase units per second at this speed
  phases: { id: string; start: number; end: number; labelKey: string; tone: string }[];
  speed: { min: number; max: number; step: number; labelKey: string; format(speed: number): string };
}

interface Explainer<S extends PlaybackState = PlaybackState> {
  id: string;
  timeline: Timeline;
  createStore(): ExplainerStore<S>;                 // zustand vanilla + subscribeWithSelector
  dock: {
    choices: Choice<S>[];                            // segmented controls: fuel, cylinders
    toggles: ViewToggle[];                           // icon buttons bound to view flags
  };
  readouts: Readout<S>[];                            // gauge rows: label, value, optional meter and tone
  actions?: Record<string, (store: ExplainerStore<S>, value: string) => void>; // [data-action] buttons in chapters
  shortcuts?: Record<string, (store: ExplainerStore<S>) => void>;              // extra keys
  mountScene(shell: SceneShell, store: ExplainerStore<S>): () => void;
  mountUi?(root: Document, store: ExplainerStore<S>): void;
}
```

`createExplainerStore` in core implements every playback action generically from
the timeline, so an explainer adds only its own fields and actions.

Core mounts the shell: language, footer, safe area, reading-line sections, the
dock (play, scrubber with phase bands, status, speed slider, choices, toggles,
reset camera, more), the gauge readouts, and the keyboard (space, arrows, digits
for phases, R, plus explainer shortcuts). Then it calls `mountScene` with a
`SceneShell` (viewport, scene, camera rig, label layer, highlighter, materials,
textures, stage, lighting, frame loop) and `mountUi` for chapter widgets.

## Translations

i18next with `en` as fallback. Resources are the deep merge of core locales and
the explainer's locales for the same language. An explainer must ship `en.json`;
any other language it ships must have the same keys, which a test enforces per
explainer. The catalogue reads `meta.title` and `meta.summary` of every explainer.

## Conventions

Kept from the engine: TypeScript strict, ESLint and Prettier over `src` and
`explainers/*/src`, Vitest for pure modules, no comments by default, no all-caps
text, `data-i18n` and `data-i18n-html` for copy, tokens in `src/core/style.css`.
