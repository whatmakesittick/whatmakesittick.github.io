import { describe, expect, it } from 'vitest';
import { STREAM_IDS } from '../ids';
import { SCENE_OPTIONS } from './sceneOptions';

describe('scene options', () => {
  it('floats the engine in a night sky without a floor or fog', () => {
    expect(SCENE_OPTIONS.background).toBe('#070b16');
    expect(SCENE_OPTIONS.stage).toBe(false);
    expect(SCENE_OPTIONS.fog).toBeUndefined();
    expect(SCENE_OPTIONS.camera).toEqual({
      near: 2,
      far: 30000,
      maxPolarAngle: Math.PI * 0.92,
      distance: { min: 60, max: 8000 },
    });
  });

  it('fades dimmed parts so the cut shows through and never dims the flow or the plume', () => {
    expect(SCENE_OPTIONS.highlight?.dim).toEqual({
      saturation: 0.35,
      brightness: 0.55,
      emissive: 0.3,
      opacity: 0.35,
    });
    for (const id of [...STREAM_IDS, 'plume']) {
      expect(SCENE_OPTIONS.highlight?.undimmed).toContain(id);
    }
  });
});
