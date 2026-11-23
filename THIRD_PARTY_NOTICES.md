# Third party notices

## MHR (Momentum Human Rig)

Copyright (c) Meta Platforms, Inc. and affiliates. Licensed under the Apache License, Version 2.0. The licence text is in
`scripts/human-body/MHR-LICENSE.txt`.

Source: https://github.com/facebookresearch/MHR, release `v1.0.1`.

`explainers/freestyle-swim/src/scene/parts/swimmer/figure/athlete.data.ts` and the files in `src/core/figure/fixtures/`
are derived from the MHR assets. They were changed: one body shape was chosen, the model was scaled to a stature of
1.88 m and converted to metres, the skinning weights were repacked, and the pose correctives were reduced to the poses
the explainer uses and quantised. See `scripts/human-body/README.md`.

## Running kinematics dataset

Fukuchi RK, Fukuchi CA, Duarte M (2017), A public dataset of running biomechanics and the effects of running speed on
lower extremity kinematics and kinetics, PeerJ 5:e3298, doi:10.7717/peerj.3298. Data: doi:10.6084/m9.figshare.4543435,
licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).

`explainers/running-form/src/model/gaitData.ts` is generated from this data by `scripts/running-form/gait-data.ts`. The
curves were changed: they were averaged over the runners, refitted with six harmonics and rounded.
