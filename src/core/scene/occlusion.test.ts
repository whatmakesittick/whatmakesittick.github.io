import { BoxGeometry, Line, Mesh, MeshBasicMaterial, Points, Sprite, SpriteMaterial } from 'three';
import type { Material, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { blockingReach, isBlocking, nextOcclusion, OCCLUSION_RULE } from './occlusion';
import type { OcclusionHit, OcclusionState } from './occlusion';

const PART = 'wheel';
const OTHER_PART = 'casing';
const ANCHOR_DISTANCE = 10;
const HALF_OPAQUE = 0.5;
const geometry = new BoxGeometry();

function solid(): MeshBasicMaterial {
  return new MeshBasicMaterial();
}

function translucent(opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({ transparent: true, opacity });
}

function hit(object: Object3D, materialIndex = 0): OcclusionHit {
  return { object, face: { materialIndex } };
}

function partsOf(entries: [Material, string][]): (material: Material) => string | undefined {
  const parts = new Map(entries);
  return (material) => parts.get(material);
}

const noParts = partsOf([]);

function blocks(object: Object3D, part = PART, partOf = noParts, materialIndex = 0): boolean {
  return isBlocking(hit(object, materialIndex), part, partOf);
}

describe('isBlocking', () => {
  it('stops at a solid mesh', () => {
    expect(blocks(new Mesh(geometry, solid()))).toBe(true);
  });

  it('looks through translucent materials but not through a transparent one at full opacity', () => {
    expect(blocks(new Mesh(geometry, translucent(HALF_OPAQUE)))).toBe(false);
    expect(blocks(new Mesh(geometry, translucent(1)))).toBe(true);
  });

  it('looks through hidden materials', () => {
    const hidden = solid();
    hidden.visible = false;
    expect(blocks(new Mesh(geometry, hidden))).toBe(false);
  });

  it('looks through the meshes of the labelled part only', () => {
    const own = solid();
    const partOf = partsOf([[own, PART]]);
    const mesh = new Mesh(geometry, own);
    expect(blocks(mesh, PART, partOf)).toBe(false);
    expect(blocks(mesh, OTHER_PART, partOf)).toBe(true);
  });

  it('looks through points, lines and sprites', () => {
    expect(blocks(new Points(geometry))).toBe(false);
    expect(blocks(new Line(geometry))).toBe(false);
    expect(blocks(new Sprite(new SpriteMaterial()))).toBe(false);
  });

  it('reads the material of the face that was hit', () => {
    const mesh = new Mesh(geometry, [translucent(HALF_OPAQUE), solid()]);
    expect(blocks(mesh, PART, noParts, 0)).toBe(false);
    expect(blocks(mesh, PART, noParts, 1)).toBe(true);
  });
});

describe('blockingReach', () => {
  it('needs a blocker clearly in front of the anchor to hide its label', () => {
    expect(blockingReach(ANCHOR_DISTANCE, false)).toBeCloseTo(
      ANCHOR_DISTANCE * (1 - OCCLUSION_RULE.hideDepth),
    );
  });

  it('reaches closer to the anchor once the label is hidden', () => {
    expect(blockingReach(ANCHOR_DISTANCE, true)).toBeGreaterThan(
      blockingReach(ANCHOR_DISTANCE, false),
    );
    expect(blockingReach(ANCHOR_DISTANCE, true)).toBeLessThan(ANCHOR_DISTANCE);
  });
});

describe('nextOcclusion', () => {
  const shown: OcclusionState = { occluded: false };
  const hidden: OcclusionState = { occluded: true };
  const step = 0.035;

  function settle(state: OcclusionState, blocked: boolean, runs: number): OcclusionState {
    let next = state;
    for (let run = 0; run < runs; run++) next = nextOcclusion(next, blocked, step);
    return next;
  }

  it('takes the first verdict at once', () => {
    expect(nextOcclusion(undefined, true, 0)).toEqual(hidden);
    expect(nextOcclusion(undefined, false, 0)).toEqual(shown);
  });

  it('hides a label once the anchor has stayed blocked for the hide delay', () => {
    const runsToHide = Math.ceil(OCCLUSION_RULE.hideSeconds / step) + 1;
    expect(settle(shown, true, runsToHide - 1).occluded).toBe(false);
    expect(settle(shown, true, runsToHide)).toEqual(hidden);
  });

  it('shows a label once the anchor has stayed clear for the show delay', () => {
    const runsToShow = Math.ceil(OCCLUSION_RULE.showSeconds / step) + 1;
    expect(settle(hidden, false, runsToShow - 1).occluded).toBe(true);
    expect(settle(hidden, false, runsToShow)).toEqual(shown);
  });

  it('starts over when the verdict flips back before the delay', () => {
    const pending = settle(shown, true, 2);
    expect(pending.pendingSeconds).toBeGreaterThan(0);
    expect(nextOcclusion(pending, false, step)).toEqual(shown);
  });
});
