import type { FramedView } from '@core/scene/cameraViews';
import type { CameraView, RegionId } from '../ids';

const ZOOM_LIMITS = { min: 0.5, max: 14 } as const;

function framed(
  region: RegionId,
  direction: readonly [number, number, number],
  margin: number,
): FramedView<RegionId> {
  return { region, direction, margin, follow: 'position', distance: ZOOM_LIMITS };
}

export const CAMERA_VIEWS: Readonly<Record<CameraView, FramedView<RegionId>>> = {
  hero: framed('body', [0.42, 0.09, 1.0], 1.15),
  foot: framed('footZone', [0.25, 0.1, 1.0], 1.15),
  leg: framed('stanceLeg', [-0.1, 0.08, 1.0], 1.1),
  behind: framed('body', [-1.0, 0.3, 0.1], 1.05),
  front: framed('upperBody', [1.0, 0.2, 0.05], 1.1),
  above: framed('upperBody', [0.1, 1.0, 0.25], 1.1),
  wide: framed('roadAhead', [0.42, 0.05, 1.0], 2.2),
};

export const BOUNDS_REGIONS: readonly RegionId[] = ['body', 'roadAhead'];

export function cameraFor(camera: CameraView, lookFrom: 'front' | 'above'): CameraView {
  return camera === 'front' ? lookFrom : camera;
}
