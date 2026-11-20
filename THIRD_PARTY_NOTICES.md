# Third party notices

## MHR (Momentum Human Rig)

Copyright (c) Meta Platforms, Inc. and affiliates. Licensed under the Apache License, Version 2.0. The licence text is in
`scripts/human-body/MHR-LICENSE.txt`.

Source: https://github.com/facebookresearch/MHR, release `v1.0.1`.

`explainers/freestyle-swim/src/scene/parts/swimmer/figure/athlete.data.ts` and the files in `src/core/figure/fixtures/`
are derived from the MHR assets. They were changed: one body shape was chosen, the model was scaled to a stature of
1.88 m and converted to metres, the skinning weights were repacked, and the pose correctives were reduced to the poses
the explainer uses and quantised. See `scripts/human-body/README.md`.
