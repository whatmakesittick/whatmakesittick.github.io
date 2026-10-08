import { describe, expect, it } from 'vitest';
import type { CameraView } from '../ids';
import { CAMERA_VIEWS, FOLLOWED_ANCHOR, STAGE_VARIANTS, stageVariant } from './cameraViews';
import type { StageVariant } from './cameraViews';
import { SCENE_OPTIONS } from '.';

const VIEWS = Object.keys(CAMERA_VIEWS) as CameraView[];
const FOLLOWING_VIEWS: readonly CameraView[] = ['nacelleCutaway', 'rotorQuarter'];
const DEGREES_PER_RADIAN = 180 / Math.PI;
const RIGHT_ANGLE_DEG = 90;
const WITHIN_FIVE_DEGREES = -1;
const AERIAL_DEG = 45;
const WAKE_DEG = 25;
const GRID_DEG = 55;
const LOW_VIEW_MAX_DEG = 10;
const OPENING_MIN_DEG = 30;
const DISTANCES: Readonly<Record<CameraView, { min: number; max: number }>> = {
  farmAerial: { min: 2000, max: 20000 },
  turbineTall: { min: 150, max: 2500 },
  nacelleCutaway: { min: 8, max: 150 },
  rotorQuarter: { min: 80, max: 1200 },
  wakeStreaks: { min: 1500, max: 18000 },
  gridSubstation: { min: 600, max: 15000 },
};

function elevation(view: CameraView, variant: StageVariant): number {
  const [x, y, z] = CAMERA_VIEWS[view].direction[variant];
  return Math.atan2(y, Math.hypot(x, z)) * DEGREES_PER_RADIAN;
}

function eachVariant(check: (variant: StageVariant) => void): void {
  STAGE_VARIANTS.forEach(check);
}

describe('camera views', () => {
  it('offers the six views, the nacelle and rotor ones turning with the yaw', () => {
    expect(VIEWS).toEqual([
      'farmAerial',
      'turbineTall',
      'nacelleCutaway',
      'rotorQuarter',
      'wakeStreaks',
      'gridSubstation',
    ]);
    expect(FOLLOWED_ANCHOR).toBe('yawPivot');
    VIEWS.forEach((view) =>
      expect(CAMERA_VIEWS[view].follow, view).toBe(
        FOLLOWING_VIEWS.includes(view) ? 'heading' : undefined,
      ),
    );
    expect(CAMERA_VIEWS.nacelleCutaway.region).toBe('nacelle');
    expect(CAMERA_VIEWS.rotorQuarter.region).toBe('rotor');
  });

  it('limits the zoom of each view', () => {
    VIEWS.forEach((view) => expect(CAMERA_VIEWS[view].distance, view).toEqual(DISTANCES[view]));
  });

  it('picks the phone framing below 600 pixels of stage width', () => {
    expect(stageVariant(599)).toBe('phone');
    expect(stageVariant(600)).toBe('desktop');
  });

  it('keeps every camera above the horizon and within the orbit limit', () => {
    const lowest =
      RIGHT_ANGLE_DEG - (SCENE_OPTIONS.camera?.maxPolarAngle ?? 0) * DEGREES_PER_RADIAN;
    VIEWS.forEach((view) =>
      eachVariant((variant) => expect(elevation(view, variant), view).toBeGreaterThan(lowest)),
    );
  });

  it('looks down on the farm from the south-southwest at about 45 degrees', () => {
    eachVariant((variant) => {
      const [x, , z] = CAMERA_VIEWS.farmAerial.direction[variant];
      expect(x).toBeLessThan(0);
      expect(z).toBeGreaterThan(Math.abs(x));
      expect(elevation('farmAerial', variant)).toBeCloseTo(AERIAL_DEG, WITHIN_FIVE_DEGREES);
    });
  });

  it('looks at the hero turbine from upwind and to the south, low', () => {
    (['turbineTall', 'rotorQuarter'] as const).forEach((view) =>
      eachVariant((variant) => {
        const [x, , z] = CAMERA_VIEWS[view].direction[variant];
        expect(x, view).toBeLessThan(0);
        expect(z, view).toBeGreaterThan(0);
        expect(elevation(view, variant), view).toBeLessThan(LOW_VIEW_MAX_DEG);
      }),
    );
  });

  it('looks into the nacelle opening from the +z side and above', () => {
    eachVariant((variant) => {
      const [x, , z] = CAMERA_VIEWS.nacelleCutaway.direction[variant];
      expect(z).toBeGreaterThan(Math.abs(x));
      expect(elevation('nacelleCutaway', variant)).toBeGreaterThan(OPENING_MIN_DEG);
    });
  });

  it('looks along the rows from the south at about 25 degrees for the wakes', () => {
    eachVariant((variant) => {
      const [x, , z] = CAMERA_VIEWS.wakeStreaks.direction[variant];
      expect(z).toBeGreaterThan(Math.abs(x));
      expect(elevation('wakeStreaks', variant)).toBeCloseTo(WAKE_DEG, WITHIN_FIVE_DEGREES);
    });
  });

  it('looks down on the substation from the south-east at about 55 degrees', () => {
    eachVariant((variant) => {
      const [x, , z] = CAMERA_VIEWS.gridSubstation.direction[variant];
      expect(x).toBeGreaterThan(0);
      expect(z).toBeGreaterThan(0);
      expect(elevation('gridSubstation', variant)).toBeCloseTo(GRID_DEG, WITHIN_FIVE_DEGREES);
    });
  });
});
