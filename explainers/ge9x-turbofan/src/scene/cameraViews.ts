import { Box3, Vector3 } from 'three';
import type { FramedView } from '@core/scene/cameraViews';
import type { CameraView, RegionId } from '../ids';
import { PERSON_HEIGHT_M, PERSON_POSITION } from '../model';

const PERSON_HALF_WIDTH_M = 0.3;

interface OffsetRegion {
  base: RegionId;
  share: number;
}

export const HERO_REGION = 'heroScene';

export const COMPRESSOR_OFFSET_REGION = 'compressorOffset';
export const TURBINES_OFFSET_REGION = 'turbinesOffset';

export type ViewRegion =
  RegionId | typeof HERO_REGION | typeof COMPRESSOR_OFFSET_REGION | typeof TURBINES_OFFSET_REGION;

const REGION_OFFSETS: Readonly<
  Record<typeof COMPRESSOR_OFFSET_REGION | typeof TURBINES_OFFSET_REGION, OffsetRegion>
> = {
  [COMPRESSOR_OFFSET_REGION]: { base: 'compressor', share: 0.175 },
  [TURBINES_OFFSET_REGION]: { base: 'turbines', share: 0.6 },
};

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<ViewRegion>>> = {
  hero: { region: HERO_REGION, direction: [-1, 0.2, 0.7], margin: 0.82 },
  compressor: { region: COMPRESSOR_OFFSET_REGION, direction: [0.2, 0.35, 1], margin: 1.05 },
  combustor: { region: 'combustor', direction: [0.25, 0.3, 1], margin: 1.05 },
  turbines: { region: TURBINES_OFFSET_REGION, direction: [0.4, 0.3, 1], margin: 1.05 },
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

export function viewRegionBox(id: ViewRegion, region: (id: RegionId) => Box3): Box3 {
  if (id === HERO_REGION) return heroBounds(region('fanFace'));
  if (id === COMPRESSOR_OFFSET_REGION || id === TURBINES_OFFSET_REGION) {
    const { base, share } = REGION_OFFSETS[id];
    const box = region(base).clone();
    return box.translate(new Vector3(box.getSize(new Vector3()).x * share, 0, 0));
  }
  return region(id);
}
