import { describe, expect, it } from 'vitest';
import { SCENE_OPTIONS } from './sceneOptions';

describe('scene options', () => {
  it('floats the rifle over the dark stage without the grid and reaches it at millimetre scale', () => {
    expect(SCENE_OPTIONS.stage).toBe(false);
    expect(SCENE_OPTIONS.fog).toBeUndefined();
    expect(SCENE_OPTIONS.camera?.near).toBeLessThan(10);
    expect(SCENE_OPTIONS.camera?.far).toBeGreaterThan(5000);
    expect(SCENE_OPTIONS.camera?.distance?.min).toBeLessThan(100);
  });

  it('keeps dimmed parts solid so a closed receiver hides its insides and never dims the hot gas', () => {
    expect(SCENE_OPTIONS.highlight?.dim?.opacity).toBeUndefined();
    expect(SCENE_OPTIONS.highlight?.undimmed).toContain('hotGas');
  });
});
