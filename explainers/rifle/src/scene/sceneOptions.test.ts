import { describe, expect, it } from 'vitest';
import { SCENE_OPTIONS } from './sceneOptions';

describe('scene options', () => {
  it('hazes the far lane without the grid and never fogs the rifle at any zoom', () => {
    expect(SCENE_OPTIONS.stage).toBe(false);
    expect(SCENE_OPTIONS.fog?.near).toBeGreaterThan(
      SCENE_OPTIONS.camera?.distance?.max ?? Infinity,
    );
    expect(SCENE_OPTIONS.fog?.far).toBeGreaterThan(SCENE_OPTIONS.fog?.near ?? 0);
    expect(SCENE_OPTIONS.camera?.near).toBeLessThan(10);
    expect(SCENE_OPTIONS.camera?.far).toBeGreaterThan(5000);
    expect(SCENE_OPTIONS.camera?.distance?.min).toBeLessThan(100);
  });

  it('keeps dimmed parts solid so a closed receiver hides its insides and never dims the hot gas', () => {
    expect(SCENE_OPTIONS.highlight?.dim?.opacity).toBeUndefined();
    expect(SCENE_OPTIONS.highlight?.undimmed).toContain('hotGas');
  });
});
