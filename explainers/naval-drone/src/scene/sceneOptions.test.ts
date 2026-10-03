import { describe, expect, it } from 'vitest';
import { SCENE_BOUNDS } from '../model/layout';
import { SHIP_CENTRE } from '../model/run';
import { HAZE, SKY } from './constants';
import { SCENE_OPTIONS } from './sceneOptions';

describe('scene options', () => {
  it('turns the stage off and hazes the horizon in the background colour', () => {
    expect(SCENE_OPTIONS.stage).toBe(false);
    expect(SCENE_OPTIONS.background).toBe(HAZE.colour);
    expect(SCENE_OPTIONS.fog?.color).toBe(SCENE_OPTIONS.background);
    expect(SCENE_OPTIONS.fog?.near).toBe(400);
    expect(SCENE_OPTIONS.fog?.far).toBe(5000);
    expect(SCENE_OPTIONS.gaugeSide).toBe('top');
  });

  it('keeps the camera above the sea and reaches the sky dome and the ship', () => {
    const camera = SCENE_OPTIONS.camera ?? {};
    expect(camera.far).toBeGreaterThan(SKY.radius);
    expect(camera.near).toBe(0.05);
    expect(camera.maxPolarAngle).toBeCloseTo(Math.PI / 2, 9);
    expect(camera.distance).toEqual({ min: 1, max: 2500 });
    expect(camera.distance?.max).toBeGreaterThan(Math.hypot(SHIP_CENTRE[0], SHIP_CENTRE[2]));
    expect(camera.far).toBeGreaterThan(SCENE_BOUNDS.x[1] - SCENE_BOUNDS.x[0]);
  });

  it('never dims the water effects, the ghost and the beams', () => {
    expect(SCENE_OPTIONS.highlight?.undimmed).toEqual([
      'jetStream',
      'bowWave',
      'spray',
      'wake',
      'wettedLength',
      'videoGhost',
      'satLink',
      'backupLink',
    ]);
    expect(SCENE_OPTIONS.highlight?.dim?.brightness).toBeGreaterThan(0.45);
  });
});
