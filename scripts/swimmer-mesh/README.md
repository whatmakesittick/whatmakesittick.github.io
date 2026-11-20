# Swimmer body mesh

Builds the compact human body mesh used by the `freestyle-swim` explainer from the MakeHuman base mesh.

```sh
source ~/.nvm/nvm.sh && nvm use
node scripts/swimmer-mesh/build.ts
```

The script downloads the source files into a temp folder (cached for reruns), shapes an adult male athletic
swimmer sized to the rig, maps the MakeHuman bone weights to the 24 bones of the explainer, simplifies the right half
with `meshoptimizer` (per slot first, then once over the whole body so no slot border stays at full resolution), cuts
the result along the finish planes (rib line, waist, thigh crease, 4 cm above the knee, cap edge and the two stripe
edges), classifies the triangles into slots by side of each plane and writes
`explainers/freestyle-swim/src/scene/parts/swimmer/skin/bodyMesh.data.ts`. The output is byte-identical on every run.
`skin/decode.ts` mirrors the stored right half into the full body at runtime.

## Source

- Repository: https://github.com/makehumancommunity/makehuman
- Pinned commit: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`
- Files: `makehuman/data/3dobjs/base.obj` (group `body` only), `makehuman/data/rigs/default.mhskel`,
  `makehuman/data/rigs/default_weights.mhw` and the targets below, all under `makehuman/data/targets/`.
- Licence: CC0 1.0. MakeHuman's `LICENSE.md` says "These assets have been released under CC0 1.0 Universal."
  https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md

## Targets

The list and weights live in `config.ts`. The weights were fitted so the rest pose matches the rig (shoulder
half-width 0.197, upper arm 0.350, forearm 0.274, wrist to fingertip 0.203, thigh 0.461, shin 0.462, ankle to toe tip
0.229, hip joint x -0.541 and half-width 0.092, in metres) and `BODY_HEIGHT` is the fitted stature. The build prints
these lengths.

- Macro blend: male, age 25 (`young`), muscle blend 0.1 minimum, 0.55 average and 0.35 maximum, weight blend 0.3 minimum and 0.7 average, split over the `universal-male-young-*muscle-*weight`
  and `proportions/male-young-*muscle-*weight-idealproportions` targets, plus an even mix of the african, asian and
  caucasian `male-young` targets.
- Torso: `torso-vshape-incr`, `torso-muscle-dorsi-incr`, `torso-muscle-pectoral-incr`, `torso-scale-vert-incr`,
  `torso-scale-horiz-decr`, `measure-shoulder-dist-decr`, `measure-waist-circ-decr`, `stomach-pregnant-decr`,
  `hip-scale-horiz-decr`.
- Limb lengths: `measure-upperarm-length-incr`, `measure-lowerarm-length-decr`, `measure-upperleg-height-incr`,
  and for both sides `hand-scale-decr` and `foot-scale-incr`.
- Muscle, for both sides: `upperarm-muscle-incr`, `lowerarm-muscle-incr`, `lowerleg-muscle-incr` and
  `upperleg-muscle-incr`.
