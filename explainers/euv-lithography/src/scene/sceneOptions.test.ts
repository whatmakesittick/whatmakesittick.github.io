import { AdditiveBlending, BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { Intersection } from 'three';
import { describe, expect, it } from 'vitest';
import { BAY_TONES } from '../theme';
import { SCENE_OPTIONS, blocksLabels } from './sceneOptions';

function hitOn(material: MeshBasicMaterial): Intersection {
  return { object: new Mesh(new BoxGeometry(), material), distance: 1, point: new Vector3() };
}

describe('euv scene options', () => {
  it('lets labels show through the glowing beam', () => {
    expect(blocksLabels(hitOn(new MeshBasicMaterial({ blending: AdditiveBlending })))).toBe(false);
  });

  it('hides labels behind solid parts', () => {
    expect(blocksLabels(hitOn(new MeshBasicMaterial()))).toBe(true);
  });

  it('melts the far end of the bay into its haze', () => {
    expect(SCENE_OPTIONS.fog?.color).toBe(BAY_TONES.haze);
    expect(SCENE_OPTIONS.background).toBe(BAY_TONES.haze);
  });
});
