import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { frameBox } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import { regionFromSpec } from '@core/scene/regions';
import type { CameraView } from '../ids';
import { CONTROL_WINDOW, FLOOR_Y, MAGNET, REGIONS } from '../model';
import { CAMERA_VIEWS, STAGE_VARIANTS, stageVariant } from './cameraViews';
import type { StageVariant } from './cameraViews';

const VIEWS = Object.keys(CAMERA_VIEWS) as CameraView[];
const TABLE_END_VIEWS: readonly CameraView[] = ['room', 'cryostat', 'voxel', 'coil'];
const SLOPES: Readonly<Record<StageVariant, FramingSlopes>> = {
  phone: { vertical: 0.75, horizontal: 0.38 },
  desktop: { vertical: 0.42, horizontal: 0.75 },
};

function cameraOf(view: CameraView, variant: StageVariant): Vector3 {
  const spec = CAMERA_VIEWS[view];
  const direction = new Vector3(...spec.direction[variant]).normalize();
  const box = regionFromSpec(REGIONS[spec.region]);
  return frameBox(box, direction, SLOPES[variant], spec.margin).position;
}

function eachVariant(check: (variant: StageVariant) => void): void {
  STAGE_VARIANTS.forEach(check);
}

describe('camera views', () => {
  it('offers the six fixed views, none following anything', () => {
    expect(VIEWS).toEqual(['room', 'cryostat', 'voxel', 'coil', 'gradient', 'console']);
    VIEWS.forEach((view) => {
      expect(CAMERA_VIEWS[view].follow, view).toBeUndefined();
      expect(REGIONS[CAMERA_VIEWS[view].region], view).toBeDefined();
    });
  });

  it('picks the phone framing below 600 pixels of stage width', () => {
    expect(stageVariant(599)).toBe('phone');
    expect(stageVariant(600)).toBe('desktop');
  });

  it('keeps every camera above the floor', () => {
    VIEWS.forEach((view) =>
      eachVariant((variant) => expect(cameraOf(view, variant).y, view).toBeGreaterThan(FLOOR_Y)),
    );
  });

  it('looks from the table end on the window side for the scanner views', () => {
    TABLE_END_VIEWS.forEach((view) =>
      eachVariant((variant) => {
        const [x, , z] = CAMERA_VIEWS[view].direction[variant];
        expect(x, view).toBeGreaterThanOrEqual(0);
        expect(z, view).toBeGreaterThan(0);
        expect(cameraOf(view, variant).z, view).toBeGreaterThan(MAGNET.halfLength);
      }),
    );
  });

  it('looks into the cutaway along x for the gradient shells', () => {
    const [x, y, z] = CAMERA_VIEWS.gradient.direction.desktop;
    expect(x).toBeGreaterThan(Math.max(Math.abs(y), Math.abs(z)));
  });

  it('turns more end-on on a phone so the rings and arrows stay large', () => {
    (['cryostat', 'voxel'] as const).forEach((view) => {
      const ratio = (variant: StageVariant): number => {
        const [x, , z] = CAMERA_VIEWS[view].direction[variant];
        return x / z;
      };
      expect(ratio('phone'), view).toBeLessThan(ratio('desktop'));
    });
  });

  it('looks from behind the table toward the screen at the control window', () => {
    eachVariant((variant) => {
      const camera = cameraOf('console', variant);
      expect(camera.x).toBeLessThan(CONTROL_WINDOW.x);
      expect(camera.z).toBeGreaterThan(CONTROL_WINDOW.centreZ);
    });
  });
});
