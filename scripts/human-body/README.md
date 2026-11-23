# Human body (MHR) export

Exports the Meta Momentum Human Rig (MHR) for the browser: one body, its 127 joint skeleton, its skinning weights and a
reduced version of its pose correctives. `src/core/figure/` reproduces the forward pass on the CPU from the output.

## Source

- Repository: https://github.com/facebookresearch/MHR, release `v1.0.1`, file `assets.zip` (the `assets/` folder:
  `lod0..6.fbx`, `corrective_blendshapes_lod*.npz`, `corrective_activation.npz`, `compact_v6_1.model`, `mhr_model.pt`,
  `LICENSE.txt`).
- Licence: Apache 2.0, copied to `MHR-LICENSE.txt`. Redistribution must carry the licence text and the notices, and
  modified files must say so. `THIRD_PARTY_NOTICES.md` at the repository root does both for the exported data.
- The assets are not committed. Treat the unzipped folder as untrusted data: do not run anything from inside it.

## Environment

```sh
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r scripts/human-body/requirements.txt
```

Run the scripts as `PYTHONDONTWRITEBYTECODE=1 .venv/bin/python scripts/human-body/<script>.py`. They need the scripts
folder on the module path, so do not use `python -I`.

## Commands

```sh
ASSETS=/path/to/assets
POSES=/path/to/stroke-poses
FIGURE=src/core/figure
OUT=explainers/freestyle-swim/src/scene/parts/swimmer/figure/athlete.data.ts

STROKE_DUMP_DIR=$POSES npx vitest run explainers/freestyle-swim/src/scene/dumpStrokePoses.test.ts
.venv/bin/python scripts/human-body/export.py --assets $ASSETS --poses $POSES --module $OUT --fixtures $FIGURE/fixtures
npx prettier --write $OUT $FIGURE/fixtures/*.json
```

The first command runs the real retarget over the stroke and writes the poses the page shows. The second fits the
correctives to them and writes the data module and the fixtures. Both are deterministic: running twice gives the same
bytes. Python files are not covered by the repository's lint.

`export.py` takes `--tolerance-mm` (2.0) and `--vertex-floor-mm` (1.0). `sweep.py` takes the same assets and poses,
fits many settings and prints the size and error table below.

## Configuration

`config.json`: `lod` (3, 4,899 vertices), `statureM` (the body is scaled uniformly to this height, 1.88 m, and every
length is converted from centimetres to metres), `body` (the first 20 identity coefficients: mass, build, hips),
`skeleton` (skeleton parameters baked into the data, here `scale_shoulder_width`). The face coefficients stay at zero.

## Stroke poses

`dumpStrokePoses.test.ts` (skipped unless `STROKE_DUMP_DIR` is set) walks the stroke through `FigureRig.retarget`, so
the runtime only parameters (`r_uparm_roll`, `l_uparm_roll`) are in. For each pose it writes the model parameters and the
127 by 7 joint parameters after the parameter transform, as float32, plus the six features per joint from
`Kinematics.features` for a few poses. Python feeds the joint parameters straight into the corrective network; the
features it builds match the TypeScript ones to 1e-7.

- `fit`: the rest pose and every pace, kick, breathing (`none`, `right`) and head up share (0, 0.5, 1), every 5
  scrubber units: 7,201 poses.
- `heldout`: the same grid at an offset of 2 units with head up shares 0, 0.25, 0.75 and 1: 9,600 poses. The fit never
  sees them.

## Outputs

- `athlete.data.ts`: the browser data module, loaded lazily. Rest vertices with the identity baked in, triangles
  (rotated to start at the lowest index, sorted, as three delta columns), skin weights (joint and 16 bit weight per
  influence), the skeleton (parents, offsets, pre-rotations, inverse bind), the parameter transform as a sparse matrix
  over the 203 settable columns, the baked constants, the first layer of the correctives and the reduced correctives.
  Integers and floats are packed into one base64 blob with a table of arrays, positions and indices as varint deltas.
- `fixtures/stroke-truth.bin` and `.json`: 60 held-out stroke poses (model parameters, including the two roll
  parameters) with 250 vertices (150 spread, 100 with the largest correctives): vertex positions with the full
  correctives from the full Python model computed from the joint parameters, and the difference to the positions
  without correctives (int16, 0.01 mm). About 330 kB.
- `fixtures/ground-truth.bin` and `.json`: 20 poses from the old offline fit (`swim-samples`) with 400 vertices, the
  full model with correctives off, all joint positions and rotations. The correctives off test uses them.
- `fixtures/swim-samples.bin` and `.json`: generic swimmer poses as MHR model parameters, written by
  `retarget_samples.py` (needs its targets file). `retarget.test.ts` and the ground truth poses use them; the
  correctives no longer do.

## Pose correctives

MHR computes `relu(W f)` from the 750 rotation features `f` and then a dense 3,000 by 14,697 matrix `B` (168 MB). The
export keeps what the stroke reaches:

1. First layer: only the units that activate on the fit poses and only features of joints that can move. Rows are
   stored as 8 bit integers with one scale per row; the fit uses the quantised rows.
2. The vertices are grouped by the body part of their main joint (limbs without the twist joints, the torso by spine
   joint, the head by head, jaw and neck). Per group, the vertices whose full correctives never reach
   `--vertex-floor-mm` over the fit poses are dropped: their error is below that floor anyway.
3. Per group a principal component basis `C` of the offsets is computed. Units are picked greedily (orthogonal
   matching pursuit) on the leading components and `U` is solved by least squares on the fit poses, so it also absorbs
   the first layer's quantisation. The number of components and units is the smallest by size whose worst vertex error
   on validation poses (every fourth pose of the fit grid, not used for the choice of `U`) is under 0.8 times
   `--tolerance-mm`. `U` is 16 bit with one scale per component; `C` is 8 bit with a step of at least 9 per cent of the
   tolerance divided by the component's largest coefficient.
4. At runtime: `offsets = (relu(W f) U) C`, added to the rest positions before skinning.

Error is the length of the rest space displacement difference between the reduced and the full correctives, per
vertex, in millimetres, over all 4,899 vertices and the 9,600 held-out poses (the mean includes the vertices that were
dropped).

### Size against error

The data module without any correctives is 103,062 bytes gzipped. Regions are the fine ones unless noted.

| tolerance mm | vertex floor mm | U bits             | gzipped     | raw         | worst mm  | mean mm   |
| ------------ | --------------- | ------------------ | ----------- | ----------- | --------- | --------- |
| 0.85         | 0.05            | 16                 | 260,330     | 472,983     | 1.034     | 0.064     |
| 0.85         | 1.0             | 16                 | 251,470     | 432,191     | 1.034     | 0.157     |
| 1.5          | 0.05            | 16                 | 206,988     | 379,206     | 1.506     | 0.103     |
| 1.5          | 1.0             | 16                 | 201,343     | 354,741     | 1.506     | 0.187     |
| 2.0          | 0.05            | 16                 | 188,729     | 350,516     | 1.865     | 0.128     |
| 2.0          | 1.0             | 16                 | 184,079     | 329,295     | 1.865     | 0.206     |
| 2.25         | 0.05            | 16                 | 184,377     | 345,187     | 1.871     | 0.152     |
| **2.25**     | **1.0**         | **16**             | **179,961** | **323,433** | **1.871** | **0.228** |
| 2.25         | 1.0             | 8                  | 180,297     | 329,034     | 2.032     | 0.250     |
| 2.25         | 1.0             | 16, coarse regions | 191,978     | 364,157     | 2.044     | 0.223     |
| 3.0          | 0.05            | 16                 | 170,390     | 318,821     | 2.846     | 0.204     |
| 3.0          | 1.0             | 16                 | 167,358     | 303,754     | 2.846     | 0.271     |

The table was measured on the stroke before its arm timing was smoothed, and the bold row was the choice then: the
smallest with worst error at most 2 mm and mean at most 0.3 mm. On the smoothed stroke that setting gives 2.10 mm
worst (176,238 bytes), so the shipped data uses tolerance 2.0 with the 1.0 mm floor: 183,750 bytes gzipped, 328,086
raw, worst 1.719 mm, mean 0.207 mm. Rerun `sweep.py` before picking a setting for another motion.

The worst error stays below the
tolerance because the choice is made on validation poses with a margin and the grid of sizes is coarse. The vertex
floor mostly drops the distal finger joints (under 1.2 mm over the stroke). The toes (up to 8 mm), the jaw and head
(up to 16 mm) and the finger bases (up to 3 mm) do move, so they keep their correctives. 8 bit `U` saves nothing: `U`
is about a tenth of the corrective bytes, `C` carries the rest.

## Another explainer

1. Add a pose dump like `dumpStrokePoses.test.ts` that writes its poses as joint parameters through its own rig and
   retarget.
2. Run `export.py` with its own config and output paths. Give it its own fixtures folder, for example
   `--fixtures src/core/figure/fixtures/<sport>`, so the swimmer's `stroke-truth` and `ground-truth` stay as they
   are, and add `--skip-ground-truth`: that step needs the swimmer's `swim-samples` in the same folder. The correctives are fitted to those poses only, so poses
   outside them are corrected less well; add intermediate values of every continuous control to the fit poses.
3. Add one entry to `TEST_BODIES` in `src/core/figure/bodies.testkit.ts` (name, data module loader, fixtures folder).
   `figure.test.ts`, `retarget.test.ts`, `partition.test.ts` and the other core body tests then run on the new body.
   `figure.test.ts` also needs the body's vertex count, and the correctives-off test needs `ground-truth` (skip it for a
   body exported with `--skip-ground-truth`).

### The runner (`running-form`)

- Config: `config.running-form.json` (the shape fitted to distance-runner tape measures, with skeleton scale
  parameters; `statureM` 1.7598 gives 1.770 m standing with the legs parallel). Every rig length comes from this
  export (`explainers/running-form/src/scene/rig/body.ts`, pinned by `bodyLengths.test.ts`).
- Poses: `dumpRunPoses.test.ts` in `explainers/running-form/src/scene/parts/runner/figure/` (skipped unless
  `RUN_DUMP_DIR` is set; `RUN_DUMP_STEP` changes the scrubber step, 5 by default) walks the run through the runner's
  rig and `FigureRig.retarget`: every pace, step rates -10, -5, 0, 5, 10 and both arm styles in `fit`; step rates -10,
  -7, -2, 3, 8, 10 at an offset of 2 units in `heldout`.

```sh
POSES=/path/to/run-poses
OUT=explainers/running-form/src/scene/parts/runner/figure/runner.data.ts
RUN_DUMP_DIR=$POSES npx vitest run explainers/running-form/src/scene/parts/runner/figure/dumpRunPoses.test.ts
.venv/bin/python scripts/human-body/export.py --assets $ASSETS --config scripts/human-body/config.running-form.json \
  --poses $POSES --module $OUT --fixtures src/core/figure/fixtures/running-form --skip-ground-truth
npx prettier --write $OUT src/core/figure/fixtures/running-form/*.json
```
