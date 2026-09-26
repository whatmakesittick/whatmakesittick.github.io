# Architecture

One website, many explainers, one repository. `src/core` is the app: the page
shell, the 3D toolkit, the store contract and translations plumbing. `vite/` is
the build that turns every explainer into a page. `src/site` is the catalogue.
An explainer is a content package under `explainers/<slug>/`, built into a page
at `/<slug>/`.

## Repository layout

| Path                      | Owns                                                                             |
| ------------------------- | -------------------------------------------------------------------------------- |
| `index.html`, `src/site/` | Catalogue page: cards per explainer grouped by category, language dropdown       |
| `src/core/`               | Everything an explainer builds on (see below)                                    |
| `src/core/page.html`      | The explainer page template: masthead, stage, gauge, dock, prose column, footer  |
| `src/core/partials/`      | Markup shared by the template and the catalogue: header actions, footer          |
| `src/core/locales/*.json` | Shell strings only: controls, footer, header chrome, keyboard, catalogue         |
| `explainers/<slug>/`      | One folder per explainer, see "Explainer package"                                |
| `vite/`                   | The `explainerPages` plugin: manifests, page generation, public files, catalogue |
| `public/`                 | Site-wide static files: favicon, icons, web manifest, catalogue link preview     |
| `scripts/`                | Social images: `social-images.sh` renders `scripts/cards/*.html`                 |
| `.github/workflows/`      | `ci.yml` on pull requests, `deploy.yml` on `main`                                |

Generated at build and dev time, never committed: `<slug>/index.html` and
`<slug>/main.ts` for every explainer, produced by the `explainerPages` Vite plugin
from `src/core/page.html` and the explainer manifest. Each generated folder gets a
`.gitignore` containing `*`, and ESLint and Prettier skip `/*/index.html` and
`/*/main.ts`, so a root folder holding those two files is always a generated page.

## Explainer package

```
explainers/engine/
  explainer.json      slug, category, cover, entry, chapters, locales, social
  chapters.html       the prose column: <section class="chapter" data-preset="…"> blocks
  locales/en.json …   everything the explainer says, including meta.title, meta.eyebrow,
                      meta.tagline, meta.description, meta.summary
  src/index.ts        export default defineExplainer({ … }), imports src/style.css
  src/style.css       styles for the explainer's own widgets and tones
  src/model/          pure simulation, unit tested
  src/state/          store extension and presets
  src/timeline.ts     the Timeline: cycle, phases, speed range, formatting
  src/scene/          part geometry, assembly, controller, camera views, store bindings
  src/ui/             dock choices and toggles, readouts, chapter actions, widgets
  public/             cover image, social card and other static files, served under /<slug>/
```

`explainer.json`:

```json
{
  "slug": "engine",
  "category": "engines",
  "cover": "cover.webp",
  "entry": "src/index.ts",
  "chapters": "chapters.html",
  "locales": ["en", "zh", "es", "uk", "pt", "fr", "de", "ja"],
  "social": { "image": "social/og-image.png", "alt": "…" }
}
```

The slug must match the folder and must not clash with a root folder
(`assets`, `src`, `public` and the like). `category` is one of `CATEGORIES` in
`src/core/manifest.ts`. `cover` and `social.image` are paths inside `public/`;
the social image is 1200 × 630. The plugin validates all of this and fails the
build with the manifest's path in the message.

The explainer imports the toolkit through the `@core/*` alias, which resolves to
`src/core/*`. Explainers carry no tooling of their own; the repository's lint,
tests and build cover them.

## Contract

`src/core/explainer.ts` defines it. The shape that matters:

```ts
interface PlaybackState {
  phase: number; // position in the cycle, 0 ≤ phase < timeline.cycle
  playing: boolean;
  speed: number; // in the explainer's speed unit, e.g. rpm
  preset: string;
  pausedByPreset: boolean;
  cameraResetToken: number;
  view: Record<string, boolean>;
}

interface PlaybackActions {
  tick(deltaSeconds: number): void;
  setPhase(phase: number): void;
  step(delta: number): void; // pauses
  jumpToPhase(id: string): void; // pauses at the phase start
  play(): void;
  pause(): void;
  togglePlaying(): void;
  setSpeed(speed: number): void; // clamped to timeline.speed
  setView(view: Partial<Record<string, boolean>>): void;
  toggleView(key: string): void;
  applyPreset(id: string): void;
  resetCamera(): void;
}

interface Timeline {
  cycle: number; // 720 for a four-stroke engine
  step: number; // scrubber step
  nudge: { fine: number; coarse: number }; // arrow keys, coarse with Shift
  labelKey: string; // scrubber label, "Crank angle"
  phasesLabelKey: string; // phase button group, "Jump to a stroke"
  formatPhase(phase: number): string; // "402°"
  describePhase(phase: number): string; // scrubber value text, "402°, power stroke"
  rate(speed: number): number; // phase units per second at this speed
  phases: { id; start; end; labelKey; jumpLabelKey; tone }[]; // tone is a CSS colour
  speed: { min; max; step; labelKey; format(speed): string; describe(speed): string };
}

interface Preset {
  view?: Partial<Record<string, boolean>>;
  speed?: number;
  pauseAt?: number; // pauses there; the next preset without it resumes
}

interface Explainer<S extends Playback = Playback> {
  id: string;
  timeline: Timeline;
  presets: Record<string, Preset>; // chapter data-preset values are checked against these
  parts: Record<string, { labelKey: string; side: 'left' | 'right' }>; // labels and highlight groups
  createStore(): ExplainerStore<S>; // zustand vanilla + subscribeWithSelector
  dock: {
    choices: Choice<S>[]; // segmented controls: { id, labelKey, shortcut?, options, select, apply }
    toggles: ViewToggle[]; // icon buttons: { view, shortcut, nameKey, shortKey, hintKey, icon }
  };
  readouts: Readout<S>[]; // gauge rows: { id, labelKey, numeric, value, tone?, meter? }
  actions?: Record<string, { run(state: S, value: string): void; current?(state: S): string }>;
  shortcuts?: Record<string, (state: S) => void>; // extra keys
  mountScene(shell: SceneShell, store: ExplainerStore<S>): () => void;
  mountUi?(root: Document, store: ExplainerStore<S>): void;
}
```

`Playback` is `PlaybackState & PlaybackActions`. `createExplainerStore` in
`src/core/store.ts` implements every playback action generically from the
timeline and the presets. An explainer passes its defaults, an `extend` function
for its own fields and actions, and an optional `presetState` that maps a preset
to its own fields. The engine store adds `engineType`, `layout`,
`compressionRatio`, `setEngineType`, `setLayout` and `setCompressionRatio`.

Core mounts the shell (`src/core/mount.ts`): the dock (play, scrubber with phase
bands, status, speed slider, choices, toggles, reset camera, more), the gauge
readouts, language, footer, `mountUi`, chapter actions, the keyboard (space,
arrows, digits for phases, R, choice and toggle shortcuts, explainer shortcuts),
reading-line sections and the safe area. Then it calls `mountScene` with a
`SceneShell`: viewport, scene, camera rig, label layer, highlighter, materials,
textures, stage, lighting and `onFrame(update)`. Core owns the frame loop: each
frame it ticks the store, runs the explainer's frame updates, eases the
highlighter and the camera, renders and lays out the labels.

A choice's `shortcut` cycles through its options. Chapter buttons use
`data-action="<name>" data-value="<value>"`; actions with `current` keep
`aria-pressed` in sync. A chapter with the `keyboard-only` class is hidden on
touch screens.

## Scene toolkit

`src/core/scene` holds what any mechanism needs: viewport and CSS2D label
renderer, camera rig with tweens and orbit controls, `frameBox` for fitting a box
into the safe area, label layer with overlap layout, highlighter, material
library, textures, lighting, stage grid and shadow, frame loop and lens. The
material library caches one material per emphasis group and finish, where a
finish is a plain `MeshStandardMaterialParameters` object the explainer owns. The
highlighter dims every group except the highlighted parts; `structure` is the
group for everything that is not a part.

## Build

`vite/explainerPages.ts` reads every `explainers/*/explainer.json` in the
`config` hook, writes the generated pages and registers them, with the root
`index.html`, as Rollup inputs. In dev it serves each explainer's `public/` under
`/<slug>/` with `sirv` and regenerates the pages when a manifest, chapters, locale,
template or partial changes. A failed regeneration is logged and shown in the error
overlay, and the next change retries it. At build it emits the same files into
`dist/<slug>/`. It also fills `<!-- partial:name -->` markers and `{{token}}`
values in the root `index.html`, and serves `virtual:explainer-catalogue`: every
manifest with the `meta` block of each shipped language, so the catalogue never
bundles an explainer's full copy.

## Translations

i18next with `en` as fallback. Resources are the deep merge of core locales and
the explainer's locales for the same language; an explainer key wins over a core
key, which is how the engine names its stage and dock. An explainer must ship
`en.json`; any other language it ships must have the same keys, placeholders and
markup, which a test enforces per explainer. The catalogue reads `meta.title`,
`meta.eyebrow` and `meta.summary` of every explainer, and the page head uses
`meta.title` and `meta.description`.

## Conventions

Kept from the engine: TypeScript strict, ESLint and Prettier over the repository,
Vitest for pure modules, no comments by default, no all-caps text, `data-i18n`,
`data-i18n-html` and `data-i18n-attr` for copy, tokens in `src/core/style.css`
mirrored by `src/core/theme.ts`. Modules shared with the Vite config
(`vite/`, `src/core/manifest.ts`) import with explicit `.ts` extensions.
