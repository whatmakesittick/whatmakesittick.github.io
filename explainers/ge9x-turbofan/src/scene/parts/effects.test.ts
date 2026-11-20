import { describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh, MeshStandardMaterial, ShaderMaterial, Vector3 } from 'three';
import type { Intersection } from 'three';
import { isGlowHit } from './effects';

function hitOn(material: ShaderMaterial | MeshStandardMaterial): Intersection {
  return { object: new Mesh(new BoxGeometry(), material), distance: 1, point: new Vector3() };
}

describe('glow hits', () => {
  it('treats transparent shader volumes that skip the depth buffer as glow', () => {
    const glow = new ShaderMaterial({ transparent: true, depthWrite: false });
    expect(isGlowHit(hitOn(glow))).toBe(true);
  });

  it('keeps solid surfaces as blockers', () => {
    expect(isGlowHit(hitOn(new MeshStandardMaterial()))).toBe(false);
    expect(isGlowHit(hitOn(new ShaderMaterial()))).toBe(false);
  });
});
