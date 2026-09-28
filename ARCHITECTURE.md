# Architecture

One website, many explainers, one repository. `src/core` is the app: the page
shell, the 3D toolkit, the store contract and translations plumbing. `vite/` is
the build that turns every explainer into a page. `src/site` is the catalogue.
An explainer is a content package under `explainers/<slug>/`, built into a page
at `/<slug>/`.

## Repository layout

| Path                      | Owns                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `index.html`, `src/site/` | Catalogue page: cards newest first, a tag filter, language dropdown             |
| `src/core/`               | Everything an explainer builds on (see below)                                   |
| `src/core/page.html`      | The explainer page template: masthead, stage, gauge, dock, prose column, footer |
| `src/core/partials/`      | Markup shared by the template and the catalogue: header actions, footer         |
| `src/core/locales/*.json` | Shell strings only: controls, footer, header chrome, keyboard, catalogue        |
| `explainers/<slug>/`      | One folder per explainer, see "Explainer package"                               |
| `vite/`                   | The `explainerPages` plugin: manifests, language pages, crawl files, catalogue  |
| `e2e/`                    | Browser smoke test run by Playwright against the production build               |
| `public/`                 | Site-wide static files: favicon, icons, web manifest, catalogue link preview    |
| `scripts/`                | Social images: `social-images.sh` renders `scripts/cards/*.html`                |
| `.github/workflows/`      | `ci.yml` on pull requests, `deploy.yml` on `main`, `smoke.yml` by hand          |

Generated at build and dev time, never committed: `<slug>/index.html` and
`<slug>/main.ts` for every explainer, `<lang>/index.html` for the catalogue and
`<lang>/<slug>/index.html` for every other language an explainer ships, produced by
the `explainerPages` Vite plugin from `src/core/page.html`, the root `index.html` and
the explainer manifest. Each generated folder gets a `.gitignore` containing `*` and
an empty `.explainer-page` marker. Prettier skips `/*/index.html`, `/*/*/index.html`
and `/*/main.ts`, and ESLint skips the generated `main.ts`, so a root folder holding
those files is always a generated page. Generation removes marked folders whose page is gone, never removes
an unmarked folder and refuses to write into one that holds files it did not write.
Language codes are reserved slugs, so a language folder never clashes with an
explainer.

## Explainer package

```
explainers/engine/
  explainer.json      slug, tags, cover, entry, chapters, locales, social
  chapters.html       the prose column: <section class="chapter" data-preset="…"> blocks
  locales/en.json …   everything the explainer says, including meta.title, meta.eyebrow,
                      meta.tagline, meta.description, meta.summary and the optional
                      meta.socialAlt
  src/index.ts        export default defineExplainer({ … }), imports src/style.css
  src/style.css       styles for the explainer's own widgets and tones
  src/model/          pure simulation, unit tested
  src/state/          store extension and presets
  src/timeline.ts     the Timeline: cycle, loop, phases, speed range, formatting
  src/scene/          geometry, assembly or diorama, controller, regions, camera view table
  src/ui/             dock choices and toggles, readouts, chapter actions, widgets
  public/             cover image, social card and other static files, served under /<slug>/
```

`explainer.json`:

```json
{
  "slug": "engine",
  "tags": ["engines", "mechanics", "vehicles"],
  "cover": "cover.webp",
  "entry": "src/index.ts",
  "chapters": "chapters.html",
  "locales": ["en", "zh", "es", "uk", "pt", "fr", "de", "ja"],
  "social": { "image": "social/og-image.png", "alt": "…" }
}
```

The slug must match the folder and must not clash with a root folder
(`assets`, `src`, `public` and the like) or with a name published from the root
`public/` (`icons`, `social`). `tags` lists at least one tag, none twice, each
from `TAGS` in `src/core/manifest.ts`: mechanics, engines, vehicles, aircraft,
flight, physics, weather, home, tools, optics, energy, earth and biology. Every tag has a label under
`catalogue.tags.<id>` in all eight core locales, which a test enforces, so a new
tag goes into `TAGS` and every core locale together. `cover` and `social.image` are paths inside `public/`;
the social image is 1200 × 630. The page head describes it with `meta.socialAlt` from the
page's locale when the locale has it, and with `social.alt` otherwise. The plugin validates all of this and fails the
build with the manifest's path in the message.

The explainer imports the toolkit through the `@core/*` alias, which resolves to
`src/core/*`. Explainers carry no tooling of their own; the repository's lint,
tests and build cover them. A helper that a second explainer needs moves to core
instead of being copied: `@core/math` has `clamp`, `lerp`, `smoothstep`,
`wrapAngle`, `FULL_TURN` and the degree conversions, and `@core/scene` has the
shared scene helpers listed under "Scene toolkit". The package keeps its own
data: dimensions, finishes, segment counts and part geometry.

## Contract

`src/core/explainer.ts` defines it. The shape that matters:

```ts
interface PlaybackState {
  phase: number; // position in the cycle, 0 ≤ phase < timeline.cycle (≤ cycle without loop)
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
  cycle: number; // 720 for a four-stroke engine, 2700 seconds for a glider flight
  loop?: boolean; // true by default; false stops at the end instead of wrapping
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
  startAt?: number; // seeks there and keeps the playing state
}

interface ScenePreset extends Preset {
  camera: string; // camera view id
  highlight: string[]; // parts the highlighter keeps bright
  labels: string[]; // parts labelled in this chapter
}

interface SceneOptions {
  background?: string; // CSS colour, THEME.background by default
  fog?: { color: string; near: number; far: number };
  stage?: boolean; // grid floor and contact shadow, true by default
  camera?: {
    near?: number; // camera planes
    far?: number;
    maxPolarAngle?: number; // orbit limit in radians
    distance?: { min?: number; max?: number }; // zoom limits in world units
  };
  highlight?: { dim?: Partial<DimStyle>; undimmed?: string[] }; // how dimmed parts look, groups that never dim
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
  scene?: SceneOptions; // sky, fog, stage and camera limits
  mountScene(shell: SceneShell, store: ExplainerStore<S>): () => void;
  mountUi?(root: Document, store: ExplainerStore<S>): void;
}
```

An explainer's presets extend `ScenePreset` from `src/core/scene/presetBinder.ts`,
which the preset binder reads (see "Scene toolkit").

`Playback` is `PlaybackState & PlaybackActions`. `createExplainerStore` in
`src/core/store.ts` implements every playback action generically from the
timeline and the presets. An explainer passes its defaults, an `extend` function
for its own fields and actions, and an optional `presetState` that maps a preset
to its own fields. The engine store adds `engineType`, `layout`,
`compressionRatio`, `setEngineType`, `setLayout` and `setCompressionRatio`.

A timeline loops by default: the phase wraps around the cycle and the scrubber
stops one step short of it, which suits a mechanism turning through a rotation.
With `loop: false` the timeline is a one-shot run with an end, such as a lightning
strike or a rocket launch: the phase is clamped to `[0, cycle]`, playback pauses
at the end, play at the end starts over from 0, the scrubber reaches the end and
the last phase stays current there. A preset's `pauseAt` and `startAt` are
wrapped or clamped the same way; `startAt` moves a chapter to its moment in the
run without stopping playback.

Core mounts the shell (`src/core/mount.ts`): the dock (play, scrubber with phase
bands, status, speed slider, choices, toggles, reset camera, more), the gauge
readouts, language, footer, `mountUi`, chapter actions, the full screen toggle,
the keyboard (space, arrows, digits for phases, R, X and Escape for full screen,
choice and toggle shortcuts, explainer shortcuts), reading-line sections and the
safe area. Then it builds the scene host from the
explainer's `scene` options and calls `mountScene` with a `SceneShell`: viewport,
scene, camera rig, label layer, highlighter, materials, textures, stage, lighting
and `onFrame(update)`. Core owns the frame loop: each frame it ticks the store,
runs the explainer's frame updates, eases the highlighter and the camera, hides
the labels whose anchor is out of sight, renders and lays out the labels. `onFrame` and `viewport.onResize` return a function that
removes the listener; the unmount that `mountScene` returns calls it.

The round button in the stage's top-right corner shows the model full screen
(`src/core/ui/stageExpansion.ts`). Expanding sets `data-stage-expanded` on the root,
which pins the stage over the whole viewport with the dock still at its bottom and
hides the rest of the page, and `createScrollLock` in `scrollLock.ts` fixes the body
at its scroll offset, pads it by the scrollbar's width and scrolls back to the same
spot on collapse. Where the Fullscreen API exists the stage then asks for full
screen, and `fullscreenchange` collapses it when the browser leaves full screen on
its own; where it is missing or refused, as on the iPhone, the pinned layout alone
is the full screen view, so both look the same. The viewport's resize observer
refits the renderer, the lens and the labels, and the reading-line sections ignore
chapters while the stage is expanded and measure the reading line again after it
collapses, so expanding never changes the chapter. X toggles it and Escape closes
it; the keyboard runs these shell keys before the explainer's bindings, and Escape
passes through when nothing is expanded. The gauge sits under the button, and the
button is 44px on a touch screen.

A choice's `shortcut` cycles through its options. Chapter buttons use
`data-action="<name>" data-value="<value>"`; actions with `current` keep
`aria-pressed` in sync. A chapter with the `keyboard-only` class is hidden on
touch screens.

## Scene toolkit

`src/core/scene` holds what any explainer needs: viewport and CSS2D label
renderer, camera rig with tweens, orbit controls and `follow(anchor)`, `frameBox`
for fitting a box into the safe area, label layer with overlap layout,
highlighter, material library, textures, lighting with its `key`, `fill` and `rim`
lights, stage grid and shadow, `PointCloud` for particles, frame loop and lens.
Shared scene helpers sit beside them: `LabelVisibility` shows only the wanted
labels that are on screen and clear of higher-priority ones, with a margin so
they do not flicker at the edge; `anchorAt` in `parts.ts` adds an empty object at
a point on a part for a label to follow; `geometry/airfoil.ts` extrudes an airfoil
blade section with `bladeGeometry`; `geometry/lathe.ts` turns a spline profile
into a solid with `sampleProfile` and `latheAlongX`; `geometry/extrude.ts` raises
a plan outline in x and z between two heights with `extrudePlan`, runs a side
profile in z and y along the x axis with `extrudeProfileAlongX`, and draws the
outlines with `roundedRectShape`, `roundedRectHole`, `planShape` and `planHole`;
`geometry/box.ts` makes an axis-aligned `box` from its bounds. The
material library caches one material per emphasis group and finish, where a
finish is a plain `MeshStandardMaterialParameters` object the explainer owns;
`register` adds a material the explainer made itself, such as points, lines or a
sprite. The highlighter dims every group except the highlighted parts;
`structure` is the group for everything that is not a part, and `backdrop`
(`UNDIMMED_GROUP`) is the group that never dims, for ground and sky. Dimming works
on tone, not opacity: it mixes a material's colour toward its own grey, darkens it
and scales its glow, down to the `DimStyle` at full dim (`DIM_STYLE`: saturation
0.25, brightness 0.45, emissive 0.2). Opacity and transparency stay the
material's own, so a translucent cloud or column of air keeps its translucency. A
style with `opacity` below 1 also fades dimmed parts, for a cutaway that must show
what sits behind a dimmed wall. The library reads a material's colour, glow and
opacity once, the first time it sees it: a part that changes its own opacity
swaps between materials, and a glow the material starts without, such as a
spark, stays the part's to drive. `groupOf(material)` returns the group a material
was made or registered for.

Every explainer gets label occlusion: the shell hides a label whose anchor sits
behind solid geometry, so a label never floats over the casing that covers its
part. `LabelOcclusion` in `labelOcclusion.ts` casts a ray from the camera to the
anchor of each label the layer shows and hides the label when a solid mesh sits in
front of the anchor. The ray looks through a material that is transparent with an
opacity below 1 (a cutaway plate, a cloud, the thermal column, gas, a dimmed part
that fades), through points, lines and sprites, through the stage, through a mesh
that opts out of frustum culling because its bounds are not kept up to date, such
as a thread, and through the labelled part itself. A mesh belongs to the part whose
group its material has in the material library, the same grouping the highlighter
dims by, so the explainers mark nothing extra. `OCCLUSION_RULE` in `occlusion.ts`
keeps a label steady: a blocker must sit 3 % of the anchor's distance in front of
it to hide the label and 1.5 % to keep it hidden, and the new verdict must hold for
0.6 s to hide the label and 0.15 s to show it again, so a part that swings past or
a grazing edge does not make it blink. The pass runs at most every fourth frame
and only when the camera, a shown anchor or the highlight moved, when the shown
labels or the anchors change, or while a verdict is pending; a label that starts
showing gets its verdict before its first frame. `OcclusionRays` builds a bounds
tree with `three-mesh-bvh` for a mesh of 64 triangles or more the first time a ray
reaches it, one tree per pass, and leaves the geometry untouched. The layer keeps
what the policy asked for in `wanted()` and shows it minus the occluded labels;
`LabelVisibility` reads `isOccluded(id)`, so an occluded label does not crowd out
a label near it.

The explainer's `scene` options shape the world around it. A mechanism keeps the
defaults: dark background, grid floor with a contact shadow, an orbit that stops
level with the target. A diorama such as a glider over terrain turns the stage
off, sets a sky colour and fog, widens the camera planes and raises
`maxPolarAngle` past a right angle so the camera can dip below the target and
look up. The zoom range comes from the bounds a controller gives
`rig.setBounds`: from 0.3 of their radius to 1.8 times the distance that fits
them. `camera.distance` sets `min` or `max` in world units instead; the sewing
machine and the glider use it.
`highlight` tunes the dimming: the glider darkens only a little, so white
clouds and gelcoat read as shaded against the sky, and the engine and the sewing
machine fade dimmed parts so their cutaways show what is behind.

| Camera call                 | Effect                                                                          |
| --------------------------- | ------------------------------------------------------------------------------- |
| `jumpTo(pose)`              | Places the camera at once                                                       |
| `tweenTo(pose)`             | Eases the camera there; any orbit or zoom by the user cancels the tween         |
| `follow(anchor)`            | Every frame moves the camera, its target and any tween by the anchor's movement |
| `follow(null)`              | Stops following; the camera stays where it is                                   |
| `setDistanceLimits(limits)` | Zoom limits for one view over the scene ones; `{}` restores them                |

Following keeps the framing fixed relative to a moving object while the user can
still orbit and zoom. A pose passed to `jumpTo` or `tweenTo` counts from the
anchor's position at the moment of the call, so frame it around the anchor's
current position. `PointCloud` is a fixed-size buffer of coloured points drawn
with `createPointMaterial`: set points with `setPoint` and `setColor`, then call
`commit` once per frame. `dispose` frees its buffers; the material stays the
caller's to dispose.

`CameraViews` in `cameraViews.ts` turns a table of views into camera moves. A
`FramedView` fits a region along a direction with a margin; the direction may be
a record of variants, one per engine layout. A `CustomView` computes its own
pose, like the glider's chase view. `follow: true` makes the camera follow the
anchor the controller gives, and `distance` sets zoom limits while the view is
current. `region(id)` returns `null` while nothing is built, and framing then
leaves the camera alone. `regions.ts` writes a region as a `RegionSpec` of `x`,
`y` and `z` extents: `regionFromSpec` turns one into a box, and `localRegions`
looks a region up by id and moves it into its root's space.

A scene binds its presets to the store with `bindPresets(shell, store, options)`
from `presetBinder.ts`. It presents the first preset at once, eases to each new
one, reframes the current view when the reader resets the camera, and on a view
change calls `onView` and updates the labels: every part while `view.labels` is
on, the preset's labels otherwise, and those stay pinned either way.

| Option      | Role                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| `presets`   | The explainer's `ScenePreset` records                                   |
| `views`     | The controller's `CameraViews`                                          |
| `parts`     | Every label id                                                          |
| `labels`    | Optional label policy; by default the label layer shows the wanted ones |
| `variant`   | Optional variant of the view directions, the engine's layout            |
| `prepare`   | Optional step before framing, so a `startAt` preset frames a fresh pose |
| `onView`    | Applies the view toggles to the scene                                   |
| `highlight` | Optional parts to highlight in place of the preset's                    |

`createLabelVisibility(shell, priority)` wraps `LabelVisibility` as a label
policy: it follows the viewport size, updates every frame and `dispose` removes
both listeners. It reads the anchors from the label layer, whose `anchors()`
returns the ones the last `attach` used. What only one explainer binds stays in
its `bindings.ts`: the engine rebuilds on a new layout and applies the
compression ratio, subscribed before `bindPresets` so a rebuilt engine is framed;
the glider swaps its glider type.

## UI toolkit

Core is a component and primitive toolkit. An explainer composes the components in
its markup and may add its own elements and styles beside them. A component binds
to markup that already exists in `chapters.html` through data hooks and never
builds the widget's DOM, so anything an explainer puts inside or around it stays
its own. Package CSS may extend the core classes; they are a base, not a closed
design.

`mountRangeWidget(root, store, options)` in `src/core/ui/rangeWidget.ts` drives a
slider with a value and readouts:

```html
<div class="range-widget">
  <div class="range-widget__header">
    <label for="stitch-length" data-i18n="…">Stitch length</label>
    <output class="number" for="stitch-length">2.5 mm</output>
  </div>
  <input id="stitch-length" type="range" class="range" data-control="stitch-length" />
  <div class="range-widget__scale" aria-hidden="true">…</div>
  <dl class="range-widget__readouts">
    <div>
      <dt data-i18n="…">Stitches per cm</dt>
      <dd data-readout="stitch-density">4</dd>
    </div>
  </dl>
</div>
```

| Option     | Role                                                                       |
| ---------- | -------------------------------------------------------------------------- |
| `control`  | The slider's `data-control` value                                          |
| `range`    | `min`, `max` and `step` of the slider                                      |
| `select`   | A tuple from the store, compared shallowly; a change re-renders the widget |
| `value`    | The slider position for the selected tuple                                 |
| `format`   | Text for the `<output for>` and the slider's `aria-valuetext`              |
| `set`      | Writes the slider position to the store on input                           |
| `readouts` | Optional `data-readout` id to text, looked up inside the widget            |
| `after`    | Optional hook with the tuple, the state and the widget element, run last   |

The widget re-renders on mount, when the tuple changes and when the language
changes. It needs the slider and the `.range-widget` around it; the output, the
scale and the readouts are optional. `after` covers what the component does not:
the helicopter sets `data-tendency` on its result, the engine lights the
typical-ratio band under its slider. The glider sets `--readout-min-width` on
`.range-widget` to fit three readouts in a row. On a touch screen the slider is
44px tall. A control the component does not fit is
written from the same primitives: `configureRange`, `showRangeValue`,
`rangeFraction` and `toPercent` in `range.ts`, `watch`, `watchLocalized` and
`watchShallowLocalized` in `subscribe.ts`, `requireElement`, `queryAll` and
`setText` in `dom.ts`.

The dock's jump chips sit under the scrubber's coloured bands. `phaseColumns` in
`src/core/ui/phases.ts` gives each phase a grid column sized by its share of the
cycle, and the dock sets it as `--phase-columns`. `--phase-min-width` on
`.phase-buttons` is `max-content`, so a chip never cuts its label: where a short
phase has no room for it, its chip is a little wider than its band.

## Build

`vite/explainerPages.ts` reads every `explainers/*/explainer.json` in the
`config` hook, writes the generated pages (`vite/sitePages.ts`) and registers them,
with the root `index.html`, as Rollup inputs. In dev it serves each explainer's
`public/` under `/<slug>/` with `sirv`, redirects a page path without its trailing
slash and regenerates the pages when a manifest, chapters, locale, template, partial
or the root `index.html` is added, changed or removed. A failed regeneration is
logged and shown in the error overlay, and the next change retries it. At build it
emits the same files into `dist/<slug>/`. It also serves
`virtual:explainer-catalogue`: every manifest with the `meta` block of each shipped
language and its publish date, newest first, so the catalogue never bundles an
explainer's full copy.

Every page is prerendered in every language it ships. English stays at `/<slug>/`
and `/`; any other language lives at `/<lang>/<slug>/` and `/<lang>/`, where the
catalogue exists in every site language and an explainer in the languages its
manifest lists. `languagePath` in `src/core/i18n/paths.ts` owns this scheme for the
build and the runtime. A page is rendered in two steps:

1. `vite/page.ts` expands the `<!-- partial:name -->` markers and fills the
   `{{token}}` values of `src/core/page.html` or the root `index.html`: `lang`, the
   translated title, description, eyebrow and tagline, the document title
   (`documentTitle`: `page.metaTitle` with the explainer's title, "How a solar panel works ·
   What makes it tick", or `catalogue.metaTitle`), the catalogue path in the
   page's language (`catalogueUrl`, `/` or `/<lang>/`), the canonical URL of the page
   itself, `og:locale` with the other languages as alternates, the Open Graph and
   Twitter tags (`og:type` is `article` on an explainer page, with its dates as
   `article:published_time` and `article:modified_time`, and `website` on the catalogue), one `<link rel="alternate" hreflang>` per language variant plus
   `x-default` for the English page, and the JSON-LD.
2. `vite/translateHtml.ts` parses the result with `node-html-parser` and translates
   every `data-i18n` (as text), `data-i18n-html` (as markup) and `data-i18n-attr`
   element, in that order, the way `translateDom` does at runtime. A `data-i18n` element
   may carry `data-i18n-values="name:key"`, which fills the `{{name}}` placeholder with the
   translation of `key`; the `<title>` composes the explainer's title this way, so an
   in-place language switch sets the same composed title. The markers stay,
   so the runtime can still switch languages. `vite/i18n.ts` builds an i18next
   instance per page from the same resources the runtime loads, the core locale
   merged with the explainer locale and English as the fallback, and the same
   options from `src/core/i18n/config.ts`, so interpolation and placeholders behave
   identically.

Only the HTML is per language. Every language page of an explainer loads the same
`/<slug>/main.ts`, and every catalogue page loads `/src/site/main.ts`, so the
scripts, styles and images are shared. The `shared` chunk is limited to
`src/core`, `node_modules` and Vite's helpers: with several pages per explainer,
"used by two pages" no longer means "used by two explainers".

The generated `<slug>/main.ts` imports the explainer's `en.json` and passes
`mountExplainer` a loader per shipped language: `en` resolves the bundled copy,
every other language is a dynamic `import()`, so Vite emits one chunk per language
and the page chunk carries English only.

### Crawl files and structured data

`vite/crawl.ts` builds `sitemap.xml` and `robots.txt` from the manifests: they are
emitted at build and served by the dev server, never committed. The sitemap lists
every page in every language, each with `xhtml:link` alternates for all its language
variants and `x-default`, and a `lastmod` for explainer pages. `robots.txt` allows
every crawler and points at the sitemap.

`vite/structuredData.ts` writes the JSON-LD. An explainer page is a `WebPage` and
`TechArticle` with its translated title and description, its own URL, `inLanguage`,
the author, and `datePublished` and `dateModified`. `vite/dates.ts` reads them with
git: the first and the last commit that touched `explainers/<slug>/`. Without git
history, or in a shallow clone, both fall back to the build date, which is why the
workflows check out with `fetch-depth: 0`. The catalogue carries a `@graph` of a
`WebSite` and an `ItemList` of the explainers in catalogue order, newest first, each linked to its
page in the catalogue's language, or in English when the explainer does not ship it.

## Catalogue

`src/site` renders the catalogue at runtime into `[data-catalogue]`: a row of
tag chips and one flat grid of cards, newest first by `compareNewestFirst` from
`src/core/manifest.ts`, the same order the build uses for the `ItemList`. Each
card is an `a.card` with the cover, eyebrow, title, summary and action, and its
tags as small chips laid over the bottom of the cover. The chips sit beside the
link in the card's `li`, never inside it, so each one is a button of its own.

The filter row offers "All" and every tag at least one explainer uses, in
vocabulary order. It selects one tag at a time: a tag chip, in the row or on a
card, selects its tag, and pressing the selected chip again clears the filter, as
does "All". Every chip keeps `aria-pressed` in sync, and cards without the tag are
hidden rather than rebuilt, so focus stays on the chip. The pure part lives in
`src/site/tagFilter.ts`: `usedTags`, `filterByTag`, `toggleTag` and the query
helpers. The selection is kept in the URL as `?tag=<id>` with `replaceState`, so a
filtered view can be shared; it is read on load on the English and every language
page, and a tag the catalogue does not offer is dropped from the URL. The language
dropdown and the language redirect keep the query, since `languageUrl` drops only
`lang`.

Every page links back to the catalogue: the explainer masthead shows the site name
as a link above the eyebrow, and the shared footer has an "All explainers" link
(`footer.catalogue`). Both carry `data-catalogue-link`. The build fills their
`href` with the catalogue in the page's language, and at runtime
`mountCatalogueLinks` from `src/core/ui/catalogueLink.ts` points them at
`catalogueHref` from `src/core/i18n/paths.ts`, which adds the base path and keeps a
`?lang=` query, so an English page translated by the query opens the English
catalogue in the same language.

## Translations

i18next with `en` as fallback. Core and explainer copy in `en` ships with the page;
every other language is a separate chunk, loaded for the detected language before
the page mounts and for a new language when the reader picks it. `initI18n` takes
the explainer's `LocaleLoaders`, one `() => Promise<Dictionary>` per language, and
loads the core locales the same way. A language's resources are the deep merge of
the core and the explainer dictionaries; an explainer key wins over a core key,
which is how the engine names its stage and dock. Each language loads once;
`setLanguage` switches after the load, and a language the explainer does not ship
falls back to its `en` copy. An explainer must ship `en.json`; any other language
it ships must have the same keys, placeholders and markup, which a test enforces
per explainer. The catalogue reads `meta.title`, `meta.eyebrow` and `meta.summary`
of every explainer from `virtual:explainer-catalogue`, and the page head uses
`meta.title` and `meta.description`, with `page.metaTitle` around the title in the
`<title>`.

The build prerenders each language (see "Build"), so the HTML a crawler fetches is
already in the page's language. Detection prefers the `/<lang>/` path prefix, then
the `?lang=` query, kept for old links and translated at runtime, then the stored
choice and the browser language. On an English URL without `?lang=`, when the stored
choice or the browser picks another language the page ships, `languagePageToOpen` in
`src/core/i18n/redirect.ts` sends the reader to that language page with
`location.replace` before anything mounts, so the back button still works. A
language page never redirects, so the English page redirects at most once, and a
crawler with an English browser and nothing stored stays on the English page. The language dropdown opens the same page in the
chosen language with a full navigation, to `/<lang>/<slug>/` or to the English page
for `en`, so the URL, the head and the content always agree. It stores the choice
first, so picking English on an English URL is not overridden by an earlier
language. A language the page does not ship switches in place instead. Catalogue
cards link to the explainer in the current language when it ships it, and to the
English page otherwise.

## Conventions

Kept from the engine: TypeScript strict, ESLint and Prettier over the repository,
Vitest for pure modules, happy-dom for `*.dom.test.ts` files, no comments by
default, no all-caps text, `data-i18n`, `data-i18n-html`, `data-i18n-attr` and
`data-i18n-values` for copy, tokens in `src/core/style.css` mirrored by `src/core/theme.ts`. Modules shared with the Vite config
(`vite/`, `src/core/manifest.ts`) import with explicit `.ts` extensions.

Fonts are self-hosted. `src/core/style.css` imports Inter (variable) and JetBrains
Mono 400 and 500 from Fontsource, so Vite emits hashed woff2 files and each page
downloads only the `unicode-range` subsets its text uses. Chinese and Japanese pages
keep Inter for Latin glyphs and use the system CJK fonts for the rest. No page loads
fonts from a third party.

`npm run test:e2e` runs the Playwright smoke test in `e2e/` against `vite preview`
of `dist/`, so build first and run `npx playwright install chromium` once. Chromium
draws WebGL in software, so the test sticks to what catches a broken page. At
desktop and iPhone 13 sizes, the phone at one device pixel per point, it opens every
explainer in English, walks its chapters and stops the scrubber mid-cycle, then loads
its last language once at `/<lang>/<slug>/`; one explainer is also opened through an
old `?lang=` link, and the catalogue in English and in the last site language. It
fails on page or console errors, untranslated copy, overflow, empty readouts, labels
over the dock or broken cards. A run takes about three minutes; CI runs it only by
hand, from the Smoke test workflow, and keeps the report when it fails.
