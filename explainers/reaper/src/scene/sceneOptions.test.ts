import { describe, expect, it } from 'vitest';
import { SATELLITE_POSITION, SCENE_BOUNDS } from '../model/layout';
import { SKY } from './constants';
import { SCENE_OPTIONS } from './sceneOptions';

describe('scene options', () => {
  it('turns the stage off and hazes the horizon in the sky colour', () => {
    expect(SCENE_OPTIONS.stage).toBe(false);
    expect(SCENE_OPTIONS.fog?.color).toBe(SCENE_OPTIONS.background);
    expect(SCENE_OPTIONS.fog?.near).toBeLessThan(SCENE_OPTIONS.fog?.far ?? 0);
    expect(SCENE_OPTIONS.gaugeSide).toBe('top');
  });

  it('reaches the sky dome and the satellite and lets the camera look up from below', () => {
    const camera = SCENE_OPTIONS.camera ?? {};
    expect(camera.far).toBeGreaterThan(SKY.radius);
    expect(camera.far).toBeGreaterThan(Math.hypot(...SATELLITE_POSITION) * 2);
    expect(camera.near).toBeLessThan(1);
    expect(camera.maxPolarAngle).toBeGreaterThan(Math.PI / 2);
    expect(camera.distance?.max).toBeGreaterThan(SCENE_BOUNDS.x[1] - SCENE_BOUNDS.x[0]);
  });

  it('never dims the beams and the missile', () => {
    expect(SCENE_OPTIONS.highlight?.undimmed).toEqual([
      'satLink',
      'losLink',
      'laserBeam',
      'missile',
    ]);
    expect(SCENE_OPTIONS.highlight?.dim?.brightness).toBeGreaterThan(0.45);
  });
});
