import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { Object3D, Texture } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, PartId, ViewOptions } from '../../../ids';
import { GAP_MM, INSET_CENTRE, MOMENTS, REST_GAP_MM, SECTION_M, motionAt } from '../../../model';
import type { Frame, NudgeSample, PartContext, Section } from '../context';
import { RESTING_NUDGE } from '../nudge';
import { FIELD_NAME } from './field';
import { buildInset } from './index';
import { magnetTop } from './layout';
import { POLES_NAME } from './magnet';
import { THRUST_ARROW_NAME, THRUST_NAME } from './thrust';

const FRAME_SECONDS = 1 / 60;
const SETTLED_SECONDS = 2;
const CLOSE = 6;
const CRUISE_UNITS = MOMENTS.fullSpeed;
const VIEWS: ViewOptions = {
  wave: false,
  gap: true,
  ghost: false,
  labels: true,
  cutaway: false,
  lineUp: false,
};

interface Built {
  section: Section;
  context: PartContext;
  materials: MaterialLibrary;
}

function stateAt(units: number, overrides: Partial<AssemblyState> = {}): AssemblyState {
  const motion = motionAt(units, 'kmh430', 'regen');
  const sectionIndex = Math.floor(motion.distance / SECTION_M);
  return {
    phase: units,
    playing: false,
    topSpeed: 'kmh430',
    brakeMode: 'regen',
    motion,
    wave: {
      on: motion.speedMs > 0,
      reversed: false,
      hz: 0,
      sectionIndex,
      nextSectionIndex: null,
      sectionStart: sectionIndex * SECTION_M,
      sectionEnd: (sectionIndex + 1) * SECTION_M,
    },
    power: { flow: 'none', onboard: 'rails', eddy: false },
    ghost: { distance: 0, speedKmh: 0, behind: 0 },
    nudge: { id: null, token: 0 },
    compare: 'transrapid',
    view: VIEWS,
    ...overrides,
  };
}

function frame(delta = FRAME_SECONDS, nudge: NudgeSample = RESTING_NUDGE): Frame {
  return { delta, cameraDistance: 0, nudge };
}

let built: Built;

function found(name: string): Object3D {
  const object = built.section.root.getObjectByName(name);
  if (!object) throw new Error(`No ${name}`);
  return object;
}

function mapOf(name: string): Texture {
  const host = found(name);
  const object = host instanceof Mesh ? host : host.children[0];
  if (!(object instanceof Mesh) || !(object.material instanceof MeshBasicMaterial)) {
    throw new Error(`${name} is not a flat mesh`);
  }
  if (!object.material.map) throw new Error(`${name} has no map`);
  return object.material.map;
}

function polesTop(): number {
  return found(POLES_NAME).position.y;
}

function settle(state: AssemblyState): void {
  built.section.setState(state);
  built.section.animate?.(frame(SETTLED_SECONDS), state);
}

beforeAll(() => {
  const materials = new MaterialLibrary();
  const textures = createSceneTextures();
  const context: PartContext = {
    materials,
    textures,
    tracker: new ResourceTracker(),
    labels: new Map<PartId, Object3D>(),
    anchors: {},
  };
  built = { section: buildInset(context), context, materials };
});

afterAll(() => {
  built.context.tracker.dispose();
  built.context.textures.dispose();
  built.materials.dispose();
});

describe('gap inset', () => {
  it('anchors the inset and its label at the panel', () => {
    built.section.root.updateMatrixWorld(true);
    const anchor = built.context.anchors.inset?.getWorldPosition(new Vector3()).toArray();
    anchor?.forEach((value, axis) => expect(value).toBeCloseTo(INSET_CENTRE[axis], CLOSE));
    expect(built.context.labels.has('gapInset')).toBe(true);
  });

  it('faces the train left side and reads forward toward plus x on screen left', () => {
    const panel = found('gapInsetPanel');
    panel.updateMatrixWorld(true);
    const normal = new Vector3(0, 0, 1).transformDirection(panel.matrixWorld);
    const localLeft = new Vector3(-1, 0, 0).transformDirection(panel.matrixWorld);
    expect(normal.z).toBeCloseTo(-1, CLOSE);
    expect(localLeft.x).toBeCloseTo(1, CLOSE);
  });

  it('hides with the gap view and keeps its label with it', () => {
    settle(stateAt(0, { view: { ...VIEWS, gap: false } }));
    expect(isShown(built.context.labels.get('gapInset') as Object3D)).toBe(false);
    settle(stateAt(0));
    expect(isShown(built.context.labels.get('gapInset') as Object3D)).toBe(true);
  });

  it('draws the resting and the floating gap twenty times larger', () => {
    settle(stateAt(0));
    expect(polesTop()).toBeCloseTo(magnetTop(REST_GAP_MM), CLOSE);
    settle(stateAt(MOMENTS.lifted));
    expect(polesTop()).toBeCloseTo(magnetTop(GAP_MM), CLOSE);
  });

  it('keeps still while standing and scrolls the poles and bands toward plus x when moving', () => {
    const standing = stateAt(MOMENTS.lifted);
    settle(standing);
    expect(built.section.animate?.(frame(), standing)).toBe(false);
    const cruising = stateAt(CRUISE_UNITS);
    settle(cruising);
    const poles = mapOf(POLES_NAME).offset.x;
    const field = mapOf(FIELD_NAME).offset.x;
    expect(built.section.animate?.(frame(), cruising)).toBe(true);
    const step = (from: number, to: number) => (((to - from) % 1) + 1) % 1;
    expect(step(poles, mapOf(POLES_NAME).offset.x)).toBeGreaterThan(0);
    expect(step(poles, mapOf(POLES_NAME).offset.x)).toBeLessThan(0.5);
    expect(step(field, mapOf(FIELD_NAME).offset.x)).toBeCloseTo(
      step(poles, mapOf(POLES_NAME).offset.x),
      CLOSE,
    );
  });

  it('hides the bands without the wave and flips the thrust arrow when braking', () => {
    const cruising = stateAt(CRUISE_UNITS);
    settle(cruising);
    expect(found(FIELD_NAME).visible).toBe(true);
    expect(found(THRUST_NAME).visible).toBe(true);
    const braking = stateAt(CRUISE_UNITS, { wave: { ...cruising.wave, reversed: true } });
    settle(braking);
    expect(found(THRUST_ARROW_NAME).scale.x).toBe(-1);
    settle(stateAt(CRUISE_UNITS, { wave: { ...cruising.wave, on: false } }));
    expect(found(FIELD_NAME).visible).toBe(false);
    expect(found(THRUST_NAME).visible).toBe(false);
  });

  it('shakes the drawn gap during a bump and settles back', () => {
    const lifted = stateAt(MOMENTS.lifted);
    settle(lifted);
    const bump: NudgeSample = { id: 'bump', gapMm: 1.5, lateralMm: 0, active: true };
    expect(built.section.animate?.(frame(FRAME_SECONDS, bump), lifted)).toBe(true);
    expect(polesTop()).toBeCloseTo(magnetTop(GAP_MM + bump.gapMm), CLOSE);
    expect(built.section.animate?.(frame(), lifted)).toBe(false);
    expect(polesTop()).toBeCloseTo(magnetTop(GAP_MM), CLOSE);
  });
});
