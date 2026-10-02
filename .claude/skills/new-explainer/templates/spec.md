# <Subject> explainer: shared spec

Facts sheet: `<slug>-facts.md` next to this file. Every number in copy or readouts comes from its "Safe numbers" table or a confirmed or approximate fact. The frozen files (committed on `feat/<slug>`, edited only by the coordinator) are the source of truth for every identifier here; when the two disagree, the file wins.

## 1. Identity

- slug, tags (from `src/core/manifest.ts`), title, eyebrow
- subject: what exactly is modelled
- what the model shows: the one story, start to end
- simplifications the copy must own: scale, compressed distances or times, drawn things that are invisible, the model's own assumptions

## 2. Timeline

Loop or one-shot. The cycle in scrubber units, and the map from units to real time if it is not linear.

| Phase id | Units | Real time | Tone |
| -------- | ----- | --------- | ---- |

Scrubber step and nudges; `formatPhase` and `describePhase` with their keys; the speed scale (min, max, step, default, format and describe keys); `rate(speed)`. Moment ids and where they sit.

## 3. Geometry constants (frozen)

World scale and subject scale; the coordinate frame and handedness (which way heading grows, what a positive bank or turn means); the layout of the surroundings; the subject's dimensions and the positions of its labelled parts.

## 4. Physics model

One line per module: frozen or builder, the function names, the formulas, the named constants with their facts-sheet numbers.

## 5. Store fields

| Field | Type | Default | Range | Reaches |
| ----- | ---- | ------- | ----- | ------- |

"Reaches" names the model function each physics-changing field feeds. Own actions. Which chapter controls reset on a chapter change and which are global.

## 6. Presets

| Preset | Camera | Speed | View flags | Seek | Labels | Highlight |
| ------ | ------ | ----- | ---------- | ---- | ------ | --------- |

## 7. Dock

Choices with shortcut and option keys; toggles with shortcuts; gauge readouts with their format keys; the gauge side.

## 8. Parts and labels

`PART_IDS`, label key pattern, label sides, `LABEL_PRIORITY`.

## 9. Chapter actions

Each action, its values and what `current` returns.

## 10. Chapter widgets (exact markup)

Per chapter: chip rows (`data-action`, `data-value`, key), readout rows (`data-readout` ids and label keys), range widgets (`data-control`, `id`, label key, output key, readouts).

## 11. Locale keys (complete)

Every key, grouped as in the newest explainer, with `meta.description` and `meta.socialAlt`, and for every text with placeholders the placeholder names the code fills.

## 12. Chapter outline for the writer

Six chapters, each a few lines of what it explains, with the facts it draws on.

## 13. Assembly contract

The `AssemblyState` fields, what `update` returns `true` for, the anchors, the regions, `chaseTarget` when the subject moves, the placeholder and how the real assembly replaces it at integration.

## 14. Scene notes

Surroundings, the subject's details, effects per view flag and state, lighting, the handedness facts to check, the six camera framings (which follow the subject, which stay fixed) and what each must show on a phone, the undimmed groups.
