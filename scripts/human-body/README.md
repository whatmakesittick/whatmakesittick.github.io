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
FIGURE=src/core/figure
OUT=explainers/freestyle-swim/src/scene/parts/swimmer/figure/athlete.data.ts

.venv/bin/python scripts/human-body/retarget_samples.py --assets $ASSETS --targets targets.json --fixtures $FIGURE/fixtures
.venv/bin/python scripts/human-body/export.py --assets $ASSETS --module $OUT --fixtures $FIGURE/fixtures
npx prettier --write $OUT $FIGURE/fixtures/*.json
```

`retarget_samples.py` is only needed for new pose samples. `export.py` reads the committed samples, so the second
command alone reproduces the module and the ground truth. Both are deterministic: running twice gives the same bytes.
Python files are not covered by the repository's lint.

## Configuration

`config.json`: `lod` (3, 4,899 vertices), `statureM` (the body is scaled uniformly to this height, 1.88 m, and every
length is converted from centimetres to metres), `body` (the first 20 identity coefficients: mass, build, hips),
`skeleton` (skeleton parameters baked into the data, here `scale_shoulder_width`). The face coefficients stay at zero.

## Outputs

- `athlete.data.ts`: the browser data module, loaded lazily. Rest vertices with the identity baked in, triangles, skin
  weights (joint and 16 bit weight per influence, at most four per vertex in MHR), the skeleton (parents, offsets,
  pre-rotations, inverse bind), the parameter transform as a sparse matrix over the 203 settable columns, the baked
  constants, the first layer of the correctives and the reduced correctives. Integers and floats are packed into one
  base64 blob with a table of arrays, positions and indices as varint deltas.
- `fixtures/swim-samples.bin` and `.json`: the swimmer's poses as MHR model parameters, 960 poses (three paces, both
  kicks, breathing `none` and `right`, head down and up, every 25 scrubber units), 16 bit integers in steps of 1e-4,
  only the columns that move. The grid and the column names are in the JSON.
- `fixtures/ground-truth.bin` and `.json`: 20 held-out poses with 400 vertices (300 spread over the mesh, 100 with the
  largest correctives), the vertices with the full correctives and with correctives off, all joint positions and
  rotations, from the full Python model. Metres, float32, layout in the JSON.

## Pose correctives

MHR computes `relu(W f)` from the 750 rotation features `f` and then a dense 3,000 by 14,697 matrix `B` (168 MB). The
export keeps what the swimmer reaches:

1. Poses are split into train, validation (every 8th) and test (every 8th, shifted) sets. The test set never touches
   the fit.
2. First layer: only the units that ever activate and only features of joints that can move. Rows are stored as 8 bit
   integers with one scale per row.
3. The vertices are grouped by the body part of their main joint. Per group, the vertices whose correctives never
   reach 0.05 mm are dropped, then a principal component basis `C` of the offsets is computed. The number of
   components is the smallest one whose worst vertex error on the validation set is under `TARGET_WORST_M` in
   `export.py` (0.9 mm). The group matrix `U = B C^T` keeps only the units that matter for the group.
4. At runtime: `offsets = (relu(W f) U) C`, added to the rest positions before skinning. Quantisation is 9 bit for `U`
   and 8 bit for `C`, with scales chosen so rounding stays under about 0.02 mm.

`export.py` prints the worst and the mean posed vertex error against the full model for validation and test poses.
Lower `TARGET_WORST_M` for a tighter fit and a larger module.

## Another explainer

1. Write its rig's target joints for every pose it needs to show in the same JSON shape as the swimmer: a list of
   `{ key, right, left, face, crown }`, where `right` and `left` hold `shoulder, elbow, wrist, handAxis, palm, hip,
knee, ankle, toe` and `face` and `crown` are unit vectors of the head, all in the rig's own frame in metres. Adapt
   the frame mapping in `retarget_samples.py` if the frame differs (the swimmer's is `(-z, x, -y)`).
2. Run `retarget_samples.py`, then `export.py` with its own config and output paths. The correctives are fitted to
   those poses only, so poses outside the samples are corrected less well.
