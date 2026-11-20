# Swimmer body mesh

Builds the compact human body mesh used by the `freestyle-swim` explainer from the MakeHuman base mesh.

```sh
source ~/.nvm/nvm.sh && nvm use
node scripts/swimmer-mesh/build.ts
```

The script downloads the source files into a temp folder (cached for reruns), shapes an adult male athletic
swimmer sized to the rig, re-poses the mesh (see Repose), maps the MakeHuman bone weights to the 26 bones of the explainer, simplifies the right half
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

## Repose

`repose.ts` re-poses the full-resolution shaped mesh once in `prepareBody`, before the weights are mapped, the half is
cut and the mesh is simplified. It uses linear blend skinning with MakeHuman's own weights (all bones, normalised per
vertex) and forward kinematics down the `default.mhskel` parent chain, each rotation about its bone's head. The right
side is posed as below and the left side is its exact mirror (each transform is reflected through z = 0), so midline
vertices stay on z = 0 (the build throws otherwise). The emitted rest joints (`joint(name)`) are the re-posed ones.

- `clavicle.R`: lateral end 15 degrees toward +x (up) and 10 degrees forward (-y).
- `shoulder01.R`: 10 degrees more of upward rotation in the arm's elevation plane.
- `upperarm01.R`: shortest arc so the shoulder-to-elbow direction is `normalize(0.17, -0.60, 0.78)`.
- `lowerarm01.R`: 20 degrees of elbow bend about the A-pose flexion axis carried through the swing.
- Forearm turn, split evenly over `lowerarm01.R` and `lowerarm02.R`, within 60 degrees, picked so the palm faces as
  close as possible to -x.
- Hand: wrist straight, `finger2..5` closed to run parallel to `finger3` (rotation about the palm normal at the first
  joint), 12 degrees of flexion per finger joint, thumb brought alongside the index and flexed 10 degrees per joint.
- `foot.R`: 40 degrees of plantar flexion about the ankle flexion axis, toes neutral.

The palm normal and sole normal are computed in the A-pose (`restpose.ts`) and rotated by the hand and foot world
rotation; the toe tip is the foot vertex farthest along the re-posed foot direction. The trunk shares in `weights.ts`
use the A-pose (pre-repose) x of each vertex, so the chest, spine and pelvis blend stays where MakeHuman put it.

The bones are `clavicle` (MakeHuman `clavicle.*`) and `scapula` (`shoulder01.*`) plus the rest of the 26 in `skin/types.ts`.
`rest.right.clavicle` is the re-posed `clavicle.R____head`.

## Targets

The list and weights live in `config.ts`. The length targets and `BODY_HEIGHT` were fitted so the A-pose (before the
repose) matches the rig within 1 mm (shoulder half-width 0.197, upper arm 0.350, forearm 0.274, wrist to fingertip
0.203, thigh 0.461, shin 0.462, ankle to toe tip 0.229, hip joint x -0.541 and half-width 0.092, in metres) and the head
width is 0.155. The build prints these and the measures below, all on the A-pose full mesh: bideltoid half-width (max
|z| within 2 cm of the shoulder joint in x), head height (chin to crown along x) and width, neck length (head joint x
minus shoulder joint x), chest depth, and the bind-pose clavicle and shoulder joints.

- Macro blend (a lean swimmer): male, age 25 (`young`), muscle blend 0.15 minimum, 0.7 average and 0.15 maximum, weight blend 0.45 minimum and 0.55 average, split over the `universal-male-young-*muscle-*weight`
  and `proportions/male-young-*muscle-*weight-idealproportions` targets, plus an even mix of the african, asian and
  caucasian `male-young` targets.
- Torso: `torso-vshape-incr` (0.08), `torso-muscle-pectoral-incr` (0.1), `torso-scale-vert-incr`,
  `torso-scale-horiz-decr`, `measure-shoulder-dist-decr`, `measure-waist-circ-decr`, `stomach-pregnant-decr`,
  `hip-scale-horiz-decr`.
- Neck and head: `neck-scale-vert-incr` (0.5), `measure-neck-circ-decr` (0.2), `head-scale-horiz-decr`.
- Upper arm slimming: `measure-upperarm-circ-decr` (0.3) and `%-upperarm-fat-decr`.
- Deltoid slimming: `%-upperarm-shoulder-muscle-incr` at -1.8 (a negative weight subtracts the target), which brings the
  bideltoid half-width from 0.262 to 0.236 with the shoulder joint still at 0.197.
- Limb lengths: `measure-upperarm-length-incr`, `measure-lowerarm-length-decr`, `measure-upperleg-height-incr`,
  and for both sides `hand-scale-decr` and `foot-scale-incr`.
- Muscle, for both sides: `upperarm-muscle-incr` (0.1), `lowerarm-muscle-incr` (0.15), `lowerleg-muscle-incr` (0.15)
  and `upperleg-muscle-incr` (0.1).

## Simplification regions

Each slot is simplified with its own keep ratio in `SIMPLIFY_BUDGET`. The chest slot is split for simplification only:
triangles whose vertices are mostly weighted to `clavicle`, `scapula`, `upperArmRoot` or `neck` form a `shoulders`
region (keep 0.85), so the shoulders keep more vertices than the rest of the chest. The upper arm (0.85), face (0.22)
and leg (0.42, knees) keep more too. Material slots do not change. The `total` triangle cap is applied over the whole
body at the end.
