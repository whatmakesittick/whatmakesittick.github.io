import { AdditiveBlending, BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { Intersection } from 'three';
import { describe, expect, it } from 'vitest';
import { blocksLabels } from './sceneOptions';

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
});
