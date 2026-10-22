import { Mesh } from 'three';
import { TRAIN } from '../../../model';
import type { PartContext } from '../context';
import type { CutUniform } from '../line/cut';
import { dropShadowAheadOfCut } from './casterCut';
import { clipBelow, featherGeometry, featherShadowMaterial } from './feather';
import { guidewayShadowBand } from './ground/paintShadows';
import { prismShadow } from './shadow';
import type { GroundPoint } from './shadow';

const TRAIN_SHADOW = {
  feather: 1.6,
  opacity: 0.5,
  lift: 0.1,
  colour: '#1f2633',
  overlap: 0.6,
} as const;

export function trainShadowOutline(): GroundPoint[] {
  const half = TRAIN.width / 2;
  const outline = prismShadow({
    x: [TRAIN.tailX, TRAIN.noseX],
    y: [TRAIN.bodyBottom, TRAIN.roof],
    z: [-half, half],
  });
  return clipBelow(outline, guidewayShadowBand()[1] + TRAIN_SHADOW.feather - TRAIN_SHADOW.overlap);
}

const TRAIN_SHADOW_PROGRAM = 'maglevTrainShadowCut';

export function trainShadow(context: PartContext, cut: CutUniform): Mesh {
  const geometry = context.tracker.track(
    featherGeometry(trainShadowOutline(), TRAIN_SHADOW.feather, TRAIN_SHADOW.lift),
  );
  const material = featherShadowMaterial(context, TRAIN_SHADOW);
  material.onBeforeCompile = (shader) => dropShadowAheadOfCut(shader, cut);
  material.customProgramCacheKey = () => TRAIN_SHADOW_PROGRAM;
  const mesh = new Mesh(geometry, material);
  mesh.name = 'trainShadow';
  mesh.renderOrder = 1;
  return mesh;
}
