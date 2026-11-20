import { Box3, Vector3 } from 'three';
import type { FramedView } from '@core/scene/cameraViews';
import type { CameraView, RegionId } from '../ids';
import { PERSON_HEIGHT_M, PERSON_POSITION } from '../model';

const PERSON_HALF_WIDTH_M = 0.3;

export const HERO_REGION = 'heroScene';

export type ViewRegion = RegionId | typeof HERO_REGION;

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<ViewRegion>>> = {
  hero: { region: HERO_REGION, direction: [-0.9, 0.25, 1], margin: 1.1 },
  compressor: { region: 'compressor', direction: [0.2, 0.35, 1], margin: 1.05 },
  combustor: { region: 'combustor', direction: [0.25, 0.3, 1], margin: 1.05 },
  turbines: { region: 'turbines', direction: [0.4, 0.3, 1], margin: 1.05 },
  side: { region: 'engineSide', direction: [0.1, 0.18, 1], margin: 1.02 },
  rear: { region: 'rear', direction: [0.9, 0.25, 1], margin: 1.1 },
};

export function heroBounds(fanFace: Box3): Box3 {
  const [x, , z] = PERSON_POSITION;
  const person = new Box3(
    new Vector3(x - PERSON_HALF_WIDTH_M, 0, z - PERSON_HALF_WIDTH_M),
    new Vector3(x + PERSON_HALF_WIDTH_M, PERSON_HEIGHT_M, z + PERSON_HALF_WIDTH_M),
  );
  return fanFace.clone().union(person);
}
