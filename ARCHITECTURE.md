# Architecture

One website, many explainers, one repository. `src/core` is the app: the page
shell, the 3D toolkit, the store contract and translations plumbing. `vite/` is
the build that turns every explainer into a page. `src/site` is the catalogue and
the about page. An explainer is a content package under `explainers/<slug>/`,
built into a page at `/<slug>/`.

## Repository layout

| Path                      | Owns                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `index.html`, `src/site/` | Catalogue page: cards newest first, a tag filter, language dropdown             |
| `src/site/about/`         | About page: template, entry, styles and its own locales, built into `/about/`   |
| `404.html`                | The page GitHub Pages serves for a missing path, filled by the build            |
| `src/core/`               | Everything an explainer builds on (see below)                                   |
| `src/core/page.html`      | The explainer page template: masthead, stage, gauge, dock, prose column, footer |
| `src/core/partials/`      | Markup shared by the template and the catalogue: header actions, footer         |
| `src/core/locales/*.json` | Shell strings only: controls, footer, header chrome, keyboard, catalogue        |
| `explainers/<slug>/`      | One folder per explainer, see "Explainer package"                               |
| `vite/`                   | The `explainerPages` plugin: manifests, language pages, crawl files, catalogue  |
| `e2e/`                    | Browser smoke test run by Playwright against the production build               |
| `public/`                 | Site-wide static files: favicon, icons, web manifest, catalogue link preview    |
| `scripts/`                | `social-images.sh` renders the icons, `favicon.ico` and `scripts/cards/*.html`  |
| `.github/workflows/`      | `ci.yml` on pull requests, `deploy.yml` on `main`, `smoke.yml` by hand          |

Generated at build and dev time, never committed: `<slug>/index.html` and
`<slug>/main.ts` for every explainer, `<lang>/index.html` for the catalogue,
`about/index.html` and `<lang>/about/index.html` for the about page, and
`<lang>/<slug>/index.html` for every other language an explainer ships, produced by
the `explainerPages` Vite plugin from `src/core/page.html`, `src/site/about/page.html`,
the root `index.html` and the explainer manifest. Each generated folder gets a `.gitignore` containing `*` and
an empty `.explainer-page` marker. Prettier skips `/*/index.html`, `/*/*/index.html`
and `/*/main.ts`, and ESLint skips the generated `main.ts`, so a root folder holding
those files is always a generated page. Generation removes marked folders whose page is gone, never removes
an unmarked folder and refuses to write into one that holds files it did not write.
Language codes and `about` are reserved slugs (`src/core/pages.ts` names the site
pages), so a language folder or the about page never clashes with an explainer.

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
scene, camera rig, label layer, highlighter, materials, textures, stage, lighting,
`onFrame(update)` and `invalidate()`. Before the first frame the host compiles
every material in the scene with `renderer.compileAsync`, so the shaders build in
parallel while the page stays responsive; three's shader error checks run in dev
only, since their queries stall the first frame. A dim style with `opacity` below 1
makes a dimmed material transparent, and that flip needs a second shader program.
So after the first frame, in idle time, `compileFadedVariants` in `materials.ts`
turns every opaque dimmable material transparent for one more `compileAsync` and
turns it back, and a chapter change then finds both programs ready instead of
compiling mid-frame. Core owns the frame loop and
draws on demand: a frame runs only when something asked for one. In a frame it
ticks the store, runs the explainer's frame updates, eases the highlighter and the
camera, hides the labels whose anchor is out of sight, renders and lays out the
labels. A store change, a camera move (orbit, zoom, damping, a tween), a resize, a
label change, a highlight fade or `invalidate()` asks for the next frame, so a
playing explainer draws every frame and a paused, still one draws nothing. A frame
update returns `true` while something it draws keeps moving on its own, such as
flowing particles or a settling ease, and the loop then draws the next frame too;
an explainer that changes the scene outside a frame and outside the store calls
`invalidate()`. `onFrame` and `viewport.onResize` return a function that
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
for fitting a box into the safe area, label layer with an overlap layout that
remembers each label's side and spot and moves it only when that spot is taken
or its home is clearly free again, so labels stay put while a part moves,
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
showing gets its verdict before its first frame. `update` returns `true` while a
verdict is pending or the last pass saw motion, and the shell keeps asking for
frames until it settles. `OcclusionRays` builds a bounds
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

The label layer places each label from its anchor projected with the camera and
from the size of its text, which a `ResizeObserver` measures when the text first
shows and whenever it changes with the language or a font; layout never reads the
DOM, so a frame forces no style or layout work. A new size asks for a frame.

The layout keeps labels off the stage overlays. `watchKeepOut` in `keepOut.ts` measures
the expand button, the gauge and the dock in the label frame's coordinates. It does this
only when one of them or the frame resizes, or when the stage expands or collapses; the
shell passes the areas to `labels.setKeepOut`. `layoutLabels` in `labelLayout.ts` places the labels in priority order (from
`createLabelVisibility`, then top to bottom). On each side it finds the free spot nearest
the label's own height, up or down with ties going down, clear of the keep-out areas, the
labels already placed and the top and bottom of the view. A label keeps its own side unless
that side has no free spot or the other side's spot is nearer by more than one label height,
so leader lines stay short. A label with no free spot on either side is hidden with
`scene-label--crowded` until a later frame has room for it, so two labels never sit on top
of each other.

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

| Option              | Role                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| `control`           | The slider's `data-control` value                                          |
| `range`             | `min`, `max` and `step` of the slider                                      |
| `select`            | A tuple from the store, compared shallowly; a change re-renders the widget |
| `value`             | The slider position for the selected tuple                                 |
| `format`            | Text for the `<output for>` and the slider's `aria-valuetext`              |
| `set`               | Writes the slider position to the store on input                           |
| `readouts`          | Optional `data-readout` id to text, looked up inside the widget            |
| `after`             | Optional hook with the tuple, the state and the widget element, run last   |
| `refreshIntervalMs` | Optional; renders at most once per interval while the tuple keeps changing |

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

Helpers that more than one explainer's widgets share:

- `CanvasSurface` in `src/core/ui/canvasSurface.ts` sizes a chart canvas to its CSS width and
  the pixel ratio, paints it only while it is near the screen and reads its font once per size
  and language; `canvasFont` and `widestText` lay out its labels.
- `disposeAll` in `src/core/ui/disposers.ts` folds a list of `Disposer` functions into one, so a
  mount can hand back a single unmount.
- `withAlpha` in `src/core/color.ts` turns a `#rrggbb` theme colour into an `rgb()` string with
  an alpha, for canvas fills and bands.
- `slowMotionFactor(speed, realTimeSpeed)` in `src/core/playback.ts` gives how many times slower
  than real life a speed stop plays, halving at every stop up to the explainer's real time stop.

The dock's jump chips sit under the scrubber's coloured bands. `phaseColumns` in
`src/core/ui/phases.ts` gives each phase a grid column sized by its share of the
cycle, and the dock sets it as `--phase-columns`. `--phase-min-width` on
`.phase-buttons` is `max-content`, so a chip never cuts its label: where a short
phase has no room for it, its chip is a little wider than its band. A chip's
accessible name is its visible label; `jumpLabelKey` becomes its `title`. The dock
stays hidden until `mountDock` has added the explainer's choices and toggles, so it
never grows in front of the reader.

## Build

`vite/explainerPages.ts` reads every `explainers/*/explainer.json` in the
`config` hook, writes the generated pages (`vite/sitePages.ts`) and registers them,
with the root `index.html`, as Rollup inputs. In dev it serves each explainer's
`public/` under `/<slug>/` with `sirv`, redirects a page path without its trailing
slash and regenerates the pages when a manifest, chapters, locale, template, partial
or the root `index.html` is added, changed or removed. A failed regeneration is
logged and shown in the error overlay, and the next change retries it. At build it
emits the same files into `dist/<slug>/`. It also serves
`virtual:explainer-catalogue`: newest first, one card per explainer with its slug,
tags, cover, languages, publish date and the title, eyebrow and summary of each
shipped language. The build prerenders the catalogue from the same list, and the
catalogue bundles only what a card shows.

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
   `x-default` for the English page, the JSON-LD, and the cover with its alt text
   (`stage.coverAlt` with the title) in a `<noscript>` inside `#scene`, so a reader or
   crawler without scripts sees the model as a still image. The footer's
   `{{languageLinks}}` lists one `<a hreflang lang>` per language the page ships, with the
   native language names from `src/core/i18n/languages.ts` and `aria-current="page"` on the
   page's own language, so the HTML links every language version without scripts.
   On a catalogue page the grid itself is prerendered too (see "Catalogue").
   The head's `{{languageRedirect}}` holds the inline language redirect on an English page
   (see "Translations") and nothing elsewhere.
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

The about page is a site page like the catalogue: `src/site/about/page.html` is
rendered by `renderAbout` in `vite/page.ts` into `about/` and `<lang>/about/` for every
site language, with the site's social image, a `WebPage` and `AboutPage` JSON-LD node
dated from git like an explainer (`vite/about.ts` loads the template, the locales and the
dates), a breadcrumb from the catalogue, the language redirect on the English page and
links to the issue tracker and the explainer checklist (`ISSUES_URL` and `PROCESS_URL` in
`vite/site.ts`). Its copy lives in `src/site/about/locales/*.json` under `about.*`, one
file per site language, so it never joins the core dictionary that every page loads; a
test keeps every language on the English keys and `about.description` within the
snippet limit. `src/site/about/main.ts` mounts the shell (language dropdown, site links,
footer) with those locales, the English copy bundled and the others as chunks, which
`vite/preloads.ts` preloads on a translated about page. The shared footer links the about
page in the page's language through `{{aboutUrl}}` and `data-about-link`, which
`mountSiteLinks` keeps pointed at it the way it does the catalogue link.

The root `404.html` is filled the same way in English, like the root `index.html` in
`transformIndexHtml`, and is a Rollup input, so it is emitted as `dist/404.html`, which
GitHub Pages serves for every missing path; the dev server serves it at `/404.html`. It
has the masthead with the site link, `notFound.title` and `notFound.text`, a link to the
catalogue and the shared footer, whose language links lead to the catalogue in every
language. It carries `<meta name="robots" content="noindex">`, no canonical link and no
script, stays out of the sitemap, and imports the core and catalogue styles inside an
inline `<style>`, which Vite inlines, so the page needs no other request and never joins
the `shared` chunk.

Only the HTML is per language. Every language page of an explainer loads the same
`/<slug>/main.ts`, and every catalogue page loads `/src/site/main.ts`, so the
scripts, styles and images are shared. Code used by two pages is split into
three chunks. `three` is Three.js. `scene` is `src/core/scene`, `three-mesh-bvh` and
every core module that imports them, such as `mount.ts`: `dependsOn` in
`vite/chunks.ts` follows a module's static imports. `shared` is the rest of
`src/core`, `node_modules` and Vite's helpers, so it never imports `scene` or
`three`, and the catalogue loads neither. Both groups are limited to `src/core`,
`node_modules` and Vite's helpers: with several pages per explainer, "used by two
pages" no longer means "used by two explainers".

The generated `<slug>/main.ts` imports the explainer's `en.json` and passes
`mountExplainer` a loader per shipped language: `en` resolves the bundled copy,
every other language is a dynamic `import()`, so Vite emits one chunk per language
and the page chunk carries English only. Vite preloads static imports only, so at
build `vite/preloads.ts` puts a `<link rel="modulepreload">` before the module
scripts of every page in another language for each language chunk it loads on
start: the explainer's locale and the core locale, or the core locale alone on a
catalogue page. The dev server goes without them.

### Crawl files and structured data

`vite/crawl.ts` builds `sitemap.xml` and `robots.txt` from the manifests: they are
emitted at build and served by the dev server, never committed. The sitemap lists
every page in every language, each with `xhtml:link` alternates for all its language
variants and `x-default`, and a `lastmod`: an explainer page's `dateModified`, and for
the catalogue the newest `dateModified` among the explainers. `robots.txt` allows
every crawler and points at the sitemap. `public/favicon.ico` holds the favicon at 16 and
32 pixels for browsers and crawlers that ask for it: `scripts/social-images.sh` renders
`public/favicon.svg` at both sizes and `scripts/favicon-ico.ts` packs the PNG files with
`encodeIco` from `vite/ico.ts`. Every page links it after the SVG icon.

### Feeds

`vite/feed.ts` builds one RSS 2.0 feed per site language: `feed.xml` for English and
`<code>/feed.xml` for the others. Each feed lists the explainers that ship its language,
newest first in catalogue order, with the translated title and summary, the page URL as a
permalink, the `datePublished` and the tags. The channel takes the catalogue's translated
title and tagline and is dated by the newest explainer. Every page advertises the feed of its
language with a `<link rel="alternate" type="application/rss+xml">` in the head, and the
footer links it. `vite/siteFiles.ts` joins the crawl files and the feeds into the one list the
plugin emits at build and serves in dev; none of them is committed. `vite/xml.ts` holds the
escaping and nesting both share.

`vite/structuredData.ts` writes the JSON-LD, a `@graph` on every page that starts with
the same `WebSite` node, whose `@id` is `https://whatmakesittick.github.io/#website`; every
page points at it with `isPartOf`. An explainer page is a `WebPage` and
`TechArticle` with its translated title and description, its own URL, `inLanguage`,
the author, `datePublished` and `dateModified`, and as `image` the social image
(1200 × 630) and the cover (932 × 699). A `BreadcrumbList` leads from the catalogue in the
page's language to the explainer. `vite/dates.ts` reads them with
git: the first and the last commit that touched `explainers/<slug>/`. Without git
history, or in a shallow clone, both fall back to the build date, which is why the
workflows check out with `fetch-depth: 0`. Each catalogue page is a `CollectionPage` in
its language whose `mainEntity` is an `ItemList` of the explainers in catalogue order,
newest first, each linked to its page in the catalogue's language, or in English when the
explainer does not ship it.

### Site check

`vite/siteCheckPlugin.ts` reads `dist/` after every build and fails it when a page breaks a
rule in `vite/siteCheck.ts`: the `lang` of the page, a title with the site name, a
description within `descriptionLimit` of its language, the canonical URL, hreflang links with
`x-default` and the page itself, one JSON-LD block that parses, one `h1`, no external
stylesheet and no Google Fonts host, a gzipped JavaScript budget (`JS_BUDGET_GZIP`, summed
over the module scripts and preloads of the page and their static imports, with the smaller
`site` budget on the catalogue and the about page), no three.js chunk
on a site page, a `modulepreload` on every translated page, one card per explainer on the
catalogue, the noscript cover and the more-explainers links on an explainer page, a sitemap
that lists exactly the built pages, a feed link to the page language on every page, a feed per
language that lists exactly its built explainers, `robots.txt`, a `noindex` 404 page without scripts and a
real `favicon.ico`. When it fails, fix the page rather than the rule, and raise a budget only
with a measurement.

## Catalogue

The catalogue is prerendered into `[data-catalogue]`: a row of tag chips and one
flat grid of cards, newest first by `compareNewestFirst` from
`src/core/manifest.ts`, the same order the build uses for the `ItemList`.
`renderCatalogueGrid` in `src/site/catalogueMarkup.ts` writes it as a string
without touching the DOM, so the build and the runtime share one renderer:
`vite/page.ts` fills the grid of every catalogue page in its language, and at
runtime `src/site` hydrates it, binding the chips to the cards already there. The
grid carries its language in `data-language`; the runtime renders it again only
when that is not the page's language, as after an old `?lang=` link. Each card is
an `a.card` with the cover, eyebrow, title and summary, and its tags as small
chips below. The chips sit beside the link in the card's `li`, never inside it, so
each one is a button of its own. Every cover is 932 × 699 and says so in its
`width` and `height`; the first three load at once with `fetchpriority="high"`,
the rest lazily.

The filter row offers "All" and every tag at least one explainer uses, in
vocabulary order. It selects one tag at a time: a tag chip, in the row or on a
card, selects its tag, and pressing the selected chip again clears the filter, as
does "All". Every chip keeps `aria-pressed` in sync, and cards without the tag are
hidden rather than rebuilt, so focus stays on the chip. The pure part lives in
`src/site/tagFilter.ts`: `usedTags`, `filterByTag`, `toggleTag` and the query
helpers. The selection is kept in the URL as `?tag=<id>` with `replaceState`, so a
filtered view can be shared; it is read on load on the English and every language
page, and a tag the catalogue does not offer is dropped from the URL. The language
dropdown keeps the query, since `languageUrl` drops only `lang`, and so does the
language redirect.

Every page links back to the catalogue: the explainer masthead shows the site name
as a link above the eyebrow, and the shared footer has an "All explainers" link
(`footer.catalogue`) and an "About" link (`footer.about`). They carry
`data-catalogue-link` and `data-about-link`. The build fills their `href` with the
page in the page's language, and at runtime `mountSiteLinks` from
`src/core/ui/siteLinks.ts` points them at `sitePageHref` from
`src/core/i18n/paths.ts`, which adds the base path and keeps a `?lang=` query, so an
English page translated by the query opens the English catalogue or about page in
the same language.

Explainers also link to each other. After the chapters, every explainer page ends
with "More explainers" (`page.moreExplainers`): three other explainers as small
cards with the cover and the title in the page's language, each linked like a
catalogue card, to its page in that language when it ships it and to the English
page otherwise. `pickMoreExplainers` in `vite/moreExplainers.ts` ranks the others
by how many tags they share with the page, the newest first among equals. The
build fills the list into the `{{moreExplainers}}` hook of `src/core/page.html`
with the cover and link helpers of `src/site/catalogueMarkup.ts`; the runtime
leaves it alone.

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
choice and the browser language. Detection never stores what it finds, so a visit
to a shared `/uk/` link does not change later visits; only the language dropdown
writes the stored choice. On an English URL without `?lang=`, when the stored
choice or the browser picks another language the page ships, the page opens that
language page with `location.replace` from an inline script at the top of its
head, before any style, font or module loads, so the reader never sees the English
page first and the back button still works. The script is
`src/core/i18n/redirectScript.ts`, bundled and minified by `vite/redirectScript.ts`
with the site's base path to under 1 kB; it reads the page's languages from its
own `data-languages` attribute and decides with `languagePageUrl` and
`languagePageToOpen` from `src/core/i18n/redirect.ts`. A test runs the bundled
script itself. A language page carries no redirect, so the English page redirects
at most once, and a crawler with an English browser and nothing stored stays on
the English page. The language dropdown opens the same page in the
chosen language with a full navigation, to `/<lang>/<slug>/` or to the English page
for `en`, so the URL, the head and the content always agree. It stores the choice
first, so picking English on an English URL is not overridden by an earlier
language; the footer's language links store the language they open in the same way
(`mountFooter`). A language the page does not ship switches in place instead. Catalogue
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
old `?lang=` link, and the catalogue and the about page in English and in the last site language. It
fails on page or console errors, untranslated copy, overflow, empty readouts, labels
over the dock or broken cards. A run takes about three minutes; CI runs it only by
hand, from the Smoke test workflow, and keeps the report when it fails.
