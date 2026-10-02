import { describe, expect, it } from 'vitest';
import { SCENE_BOUNDS } from '../model/layout';
import { THEME } from '../theme';
import { SKY } from './constants';
import { SCENE_OPTIONS } from './sceneOptions';

describe('scene options', () => {
  it('turns the stage off and fogs the field in the horizon colour', () => {
    expect(SCENE_OPTIONS.stage).toBe(false);
    expect(SCENE_OPTIONS.background).toBe(THEME.skyHorizon);
    expect(SCENE_OPTIONS.fog?.color).toBe(SCENE_OPTIONS.background);
    expect(SCENE_OPTIONS.fog?.near).toBeLessThan(SCENE_OPTIONS.fog?.far ?? 0);
    expect(SCENE_OPTIONS.fog?.near).toBeGreaterThan(SCENE_BOUNDS.x[1] - SCENE_BOUNDS.x[0]);
    expect(SCENE_OPTIONS.gaugeSide).toBe('top');
  });

  it('reaches the sky dome and lets the camera look up from below', () => {
    const camera = SCENE_OPTIONS.camera ?? {};
    expect(camera.far).toBeGreaterThan(SKY.radius * 2);
    expect(camera.near).toBeLessThan(1);
    expect(camera.maxPolarAngle).toBeGreaterThan(Math.PI / 2);
    expect(camera.distance?.max).toBeGreaterThan(SCENE_BOUNDS.x[1] - SCENE_BOUNDS.x[0]);
  });

  it('never dims the links and the spin arrows', () => {
    expect(SCENE_OPTIONS.highlight?.undimmed).toEqual(['controlLink', 'videoLink', 'spinArrows']);
    expect(SCENE_OPTIONS.highlight?.dim?.brightness).toBeGreaterThan(0.45);
  });
});
