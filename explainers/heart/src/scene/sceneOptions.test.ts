import { describe, expect, it } from 'vitest';
import { SCENE_OPTIONS } from './sceneOptions';

describe('scene options', () => {
  it('floats the heart over the stage and dims by colour only', () => {
    expect(SCENE_OPTIONS.stage).toBe(true);
    expect(SCENE_OPTIONS.camera?.distance?.min).toBe(25);
    expect(SCENE_OPTIONS.camera?.far).toBeGreaterThan(SCENE_OPTIONS.camera?.near ?? 0);
    expect(SCENE_OPTIONS.highlight?.dim?.opacity).toBe(1);
  });

  it('never dims the blood', () => {
    expect(SCENE_OPTIONS.highlight?.undimmed).toEqual(['venousBlood', 'arterialBlood']);
  });
});
