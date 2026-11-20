# Swimmer body mesh

Builds the compact human body mesh used by the `freestyle-swim` explainer from the MakeHuman base mesh.

```sh
source ~/.nvm/nvm.sh && nvm use
node scripts/swimmer-mesh/build.ts
```

The script downloads the source files into a temp folder (cached for reruns), shapes an adult male athletic
swimmer, maps the MakeHuman bone weights to the 24 bones of the explainer, splits the surface into slots,
simplifies each slot with `meshoptimizer` and writes
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

The list and weights live in `config.ts`.

- Macro blend: male, age 25 (`young`), muscle 0.8 and weight 0.35 split over the `universal-male-young-*muscle-*weight`
  and `proportions/male-young-*muscle-*weight-idealproportions` targets, plus an even mix of the african, asian and
  caucasian `male-young` targets.
- Details: `torso-vshape-incr`, `torso-muscle-dorsi-incr`, `torso-muscle-pectoral-incr`, `measure-shoulder-dist-incr`,
  `measure-waist-circ-decr`, `stomach-pregnant-decr`, `hip-scale-horiz-decr`, and for both sides the
  `upperarm-muscle-incr`, `upperarm-shoulder-muscle-incr`, `lowerarm-muscle-incr`, `lowerleg-muscle-incr` and
  `upperleg-muscle-incr` targets.
