import { describe, expect, it } from 'vitest';
import { PRESETS } from '../state';
import { BOOSTER_DISTANCE, CAMERA_VIEWS, NOZZLE_DISTANCE } from './cameraViews';

describe('camera views', () => {
  it('offers every view the chapters ask for', () => {
    Object.values(PRESETS).forEach((preset) => expect(CAMERA_VIEWS[preset.camera]).toBeDefined());
  });

  it('frames the regions the spec names', () => {
    expect(
      Object.fromEntries(Object.entries(CAMERA_VIEWS).map(([id, view]) => [id, view.region])),
    ).toEqual({
      hero: 'hero',
      powerhead: 'powerhead',
      turbopumps: 'turbopumps',
      chamber: 'chamber',
      nozzle: 'nozzleAndPlume',
      booster: 'booster',
    });
  });

  it('looks from the front at the engine and from below at the booster', () => {
    Object.values(CAMERA_VIEWS).forEach((view) =>
      expect((view.direction as readonly number[])[2]).toBeGreaterThan(0),
    );
    expect((CAMERA_VIEWS.booster.direction as readonly number[])[1]).toBeLessThan(0);
    expect((CAMERA_VIEWS.hero.direction as readonly number[])[1]).toBeGreaterThan(0);
  });

  it('lets the camera pull far back only for the plume and the booster', () => {
    expect(CAMERA_VIEWS.nozzle.distance).toEqual(NOZZLE_DISTANCE);
    expect(CAMERA_VIEWS.booster.distance).toEqual(BOOSTER_DISTANCE);
    (['hero', 'powerhead', 'turbopumps', 'chamber'] as const).forEach((id) =>
      expect(CAMERA_VIEWS[id].distance, id).toBeUndefined(),
    );
  });
});
