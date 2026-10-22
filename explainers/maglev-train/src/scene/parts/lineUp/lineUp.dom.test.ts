import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Box3, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, PartId } from '../../../ids';
import { ANCHOR_POINTS, CUT_X, LINE_UP, MOMENTS, mm, motionAt } from '../../../model';
import type { PartContext, Section } from '../context';
import { CALLOUTS_NAME } from './callouts';
import { buildLineUp } from './index';
import { SCMAGLEV_NAME } from './scmaglev';

const TRIANGLE_BUDGET = 25_000;
const DIGITS = 4;
const CUT_FACE_REACH = 0.02;
const LINE_UP_PARTS: readonly PartId[] = ['scmaglev', 'wheelRail', 'gapCallouts'];

function stateWith(lineUp: boolean): AssemblyState {
  const motion = motionAt(MOMENTS.fullSpeed, 'kmh430', 'regen');
  return {
    phase: MOMENTS.fullSpeed,
    playing: false,
    topSpeed: 'kmh430',
    brakeMode: 'regen',
    motion,
    wave: {
      on: true,
      reversed: false,
      hz: 0,
      sectionIndex: 0,
      nextSectionIndex: null,
      sectionStart: 0,
      sectionEnd: 0,
    },
    power: { flow: 'none', onboard: 'rails', eddy: false },
    ghost: { distance: 0, speedKmh: 0, behind: 0 },
    nudge: { id: null, token: 0 },
    compare: 'transrapid',
    view: { wave: false, gap: false, ghost: false, labels: true, cutaway: true, lineUp },
  };
}

function triangles(root: Object3D): number {
  let total = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const { index, attributes } = object.geometry;
    const count = (index?.count ?? attributes.position.count) / 3;
    total += 'count' in object && typeof object.count === 'number' ? count * object.count : count;
  });
  return total;
}

function named(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`No ${name}`);
  return found;
}

let materials: MaterialLibrary;
let textures: ReturnType<typeof createSceneTextures>;
let tracker: ResourceTracker;
let context: PartContext;
let section: Section;

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  tracker = new ResourceTracker();
  context = { materials, tracker, textures, labels: new Map(), anchors: {} };
  section = buildLineUp(context);
  section.root.updateMatrixWorld(true);
});

afterAll(() => {
  tracker.dispose();
  materials.dispose();
  textures.dispose();
});

describe('line-up', () => {
  it('shows only with the line-up view', () => {
    section.setState(stateWith(false));
    expect(section.root.visible).toBe(false);
    section.setState(stateWith(true));
    expect(section.root.visible).toBe(true);
  });

  it('hangs every label under the section and anchors the line-up', () => {
    LINE_UP_PARTS.forEach((part) => {
      const anchor = context.labels.get(part);
      expect(anchor).toBeDefined();
      section.setState(stateWith(false));
      expect(isShown(anchor as Object3D)).toBe(false);
    });
    const anchor = context.anchors['lineUp' satisfies AnchorId] as Object3D;
    expect(anchor.getWorldPosition(new Vector3()).toArray()).toEqual([...ANCHOR_POINTS.lineUp]);
  });

  it('turns the callouts toward a reader ahead of the cut', () => {
    const callouts = named(section.root, CALLOUTS_NAME);
    callouts.updateMatrixWorld(true);
    const facing = callouts.getWorldDirection(new Vector3());
    expect(facing.x).toBeCloseTo(1, DIGITS);
    expect(callouts.getWorldPosition(new Vector3()).x).toBeGreaterThan(CUT_X);
  });

  it('floats the L0 a true 100 mm above its channel floor', () => {
    const scmaglev = named(section.root, SCMAGLEV_NAME);
    const body = new Box3().setFromObject(named(scmaglev, 'scmaglevBody'));
    const plinth = new Box3().setFromObject(named(scmaglev, 'lineUpPlinth'));
    expect(body.min.y - plinth.max.y).toBeCloseTo(mm(LINE_UP.scmaglev.gapMm), DIGITS);
    expect(body.max.x - CUT_X).toBeGreaterThanOrEqual(0);
    expect(body.max.x - CUT_X).toBeLessThan(CUT_FACE_REACH);
  });

  it('stays within its triangle budget', () => {
    expect(triangles(section.root)).toBeLessThan(TRIANGLE_BUDGET);
  });
});
