import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { Intersection } from 'three';
import { describe, expect, it } from 'vitest';
import { CUT_TOP } from '../constants';
import { applyCut, createCut, keepsCutHit, setCut } from './cut';
import type { CutMode } from './cut';

const CUT_X = 0;
const BELOW_TOP = CUT_TOP - 0.1;
const CUT_AWAY = new Vector3(CUT_X - 1, BELOW_TOP, 0);
const KEPT = new Vector3(CUT_X + 1, BELOW_TOP, 0);

function hitOn(mode: CutMode | null, point: Vector3, enabled = true): Intersection {
  const cut = createCut();
  setCut(cut, enabled, CUT_X);
  const material = new MeshBasicMaterial();
  if (mode) applyCut(material, cut, mode);
  const object = new Mesh(new BoxGeometry(), material);
  return { object, point, distance: 1 };
}

describe('keepsCutHit', () => {
  it('drops a hit on the cut-away half of a removing material', () => {
    expect(keepsCutHit(hitOn('remove', CUT_AWAY))).toBe(false);
    expect(keepsCutHit(hitOn('remove', KEPT))).toBe(true);
  });

  it('keeps only the cut-away half of a keeping material', () => {
    expect(keepsCutHit(hitOn('keep', CUT_AWAY))).toBe(true);
    expect(keepsCutHit(hitOn('keep', KEPT))).toBe(false);
  });

  it('keeps every hit while the cut is off or the material is not cut', () => {
    expect(keepsCutHit(hitOn('remove', CUT_AWAY, false))).toBe(true);
    expect(keepsCutHit(hitOn(null, CUT_AWAY))).toBe(true);
  });
});
