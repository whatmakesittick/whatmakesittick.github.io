import { describe, expect, it } from 'vitest';
import { ROOM } from '../model/layout';
import { HAZE } from './constants';
import { SCENE_OPTIONS } from './sceneOptions';

describe('scene options', () => {
  it('turns the stage off on the theme background with a matching haze', () => {
    expect(SCENE_OPTIONS.stage).toBe(false);
    expect(SCENE_OPTIONS.background).toBe(HAZE.colour);
    expect(SCENE_OPTIONS.fog?.color).toBe(SCENE_OPTIONS.background);
    expect(SCENE_OPTIONS.gaugeSide).toBe('top');
  });

  it('keeps the camera above the floor and lets it leave the room', () => {
    const camera = SCENE_OPTIONS.camera ?? {};
    expect(camera.maxPolarAngle).toBeLessThan(Math.PI / 2);
    expect(camera.distance?.max).toBeGreaterThan(ROOM.z[1] - ROOM.z[0]);
    expect(camera.far).toBeGreaterThan(2 * (camera.distance?.max ?? 0));
    expect(SCENE_OPTIONS.fog?.near).toBeGreaterThan(camera.distance?.max ?? 0);
  });

  it('never dims the room and the field lines', () => {
    expect(SCENE_OPTIONS.highlight?.undimmed).toEqual(['room', 'fieldLinesGroup']);
  });
});
