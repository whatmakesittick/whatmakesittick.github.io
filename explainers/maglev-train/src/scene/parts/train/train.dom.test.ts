import { Box3, InstancedMesh, Mesh, Texture, Vector3 } from 'three';
import type { MeshStandardMaterial, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AssemblyState, PartId, ViewOptions } from '../../../ids';
import {
  CUT_X,
  GIRDER,
  GUIDEWAY_TOP,
  MOMENTS,
  SECTION_M,
  STATOR_BOTTOM,
  TRAIN,
  motionAt,
} from '../../../model';
import type { Frame, PartContext } from '../context';
import { RESTING_NUDGE } from '../nudge';
import { buildTrain } from './index';

const TRIANGLE_BUDGET = 200_000;
const FRAME_SECONDS = 1 / 60;
const EASE_FRAMES = 120;
const CAP_DEPTH = 0.01;
const TRAIN_PARTS: readonly PartId[] = [
  'train',
  'wrapArms',
  'supportMagnets',
  'guidanceMagnets',
  'eddyBrakes',
  'skids',
];
const VIEW: ViewOptions = {
  wave: false,
  gap: false,
  ghost: false,
  labels: true,
  cutaway: false,
  lineUp: false,
};

function stateAt(units: number, patch: Partial<AssemblyState> = {}): AssemblyState {
  const motion = motionAt(units, 'kmh430', 'eddy');
  return {
    phase: units,
    playing: false,
    topSpeed: 'kmh430',
    brakeMode: 'eddy',
    motion,
    wave: {
      on: false,
      reversed: false,
      hz: 0,
      sectionIndex: 0,
      nextSectionIndex: 1,
      sectionStart: 0,
      sectionEnd: SECTION_M,
    },
    power: { flow: 'none', onboard: 'rails', eddy: false },
    ghost: { distance: 0, speedKmh: 0, behind: 0 },
    nudge: { id: null, token: 0 },
    compare: 'transrapid',
    view: VIEW,
    ...patch,
  };
}

function build() {
  const texture = new Texture();
  const context: PartContext = {
    materials: new MaterialLibrary(),
    tracker: new ResourceTracker(),
    textures: { dot: texture, glow: texture, shadow: texture, dispose: () => undefined },
    labels: new Map(),
    anchors: {},
  };
  const section = buildTrain(context);
  section.setState(stateAt(MOMENTS.lifted));
  return { context, section };
}

function meshes(root: Object3D, part?: string): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh && (!part || object.name === part)) found.push(object);
  });
  return found;
}

function triangles(mesh: Mesh): number {
  const { index, attributes } = mesh.geometry;
  const count = (index?.count ?? attributes.position.count) / 3;
  return mesh instanceof InstancedMesh ? count * mesh.count : count;
}

function shownBounds(root: Object3D, part: string): Box3 {
  root.updateMatrixWorld(true);
  const bounds = new Box3();
  meshes(root, part)
    .filter(isShown)
    .forEach((mesh) => bounds.union(new Box3().setFromObject(mesh, true)));
  return bounds;
}

const frame: Frame = { delta: FRAME_SECONDS, cameraDistance: 50, nudge: RESTING_NUDGE };

describe('buildTrain', () => {
  it('stays within its triangle budget', () => {
    const { section } = build();
    const total = meshes(section.root).reduce((sum, mesh) => sum + triangles(mesh), 0);
    expect(total).toBeLessThan(TRIANGLE_BUDGET);
  });

  it('labels its six parts and sets its scene anchors', () => {
    const { context } = build();
    expect([...context.labels.keys()].sort()).toEqual([...TRAIN_PARTS].sort());
    expect(Object.keys(context.anchors).sort()).toEqual(['arm', 'cut', 'nose', 'tail']);
  });

  it('runs nose first toward +x with the arms wrapped under the girder edges', () => {
    const { section } = build();
    const body = shownBounds(section.root, 'train');
    expect(body.max.x).toBeCloseTo(TRAIN.noseX, 1);
    expect(body.min.x).toBeCloseTo(TRAIN.tailX, 1);
    const arms = shownBounds(section.root, 'wrapArms');
    expect(arms.min.y).toBeCloseTo(TRAIN.armBottom, 2);
    expect(arms.min.y).toBeLessThan(GUIDEWAY_TOP - GIRDER.cantileverDepth);
    expect(arms.max.z).toBeGreaterThan(GIRDER.topWidth / 2);
    expect(arms.min.z).toBeLessThan(-GIRDER.topWidth / 2);
    const support = shownBounds(section.root, 'supportMagnets');
    expect(support.max.y).toBeLessThan(STATOR_BOTTOM);
  });

  it('lowers onto the skids at rest and lifts when floating', () => {
    const { section } = build();
    const floating = shownBounds(section.root, 'skids').min.y;
    section.setState(stateAt(0));
    const resting = shownBounds(section.root, 'skids').min.y;
    expect(resting).toBeCloseTo(GUIDEWAY_TOP, 3);
    expect(floating).toBeGreaterThan(resting);
  });

  it('hides everything ahead of the cut in the cutaway view', () => {
    const { section } = build();
    section.setState(stateAt(MOMENTS.lifted, { view: { ...VIEW, cutaway: true } }));
    TRAIN_PARTS.filter((part) => part !== 'eddyBrakes').forEach((part) =>
      expect(shownBounds(section.root, part).max.x).toBeLessThanOrEqual(CUT_X + CAP_DEPTH),
    );
  });

  it('eases the eddy brake glow in and settles', () => {
    const { section } = build();
    const eddy = meshes(section.root, 'eddyBrakes')[0];
    const material = eddy.material as MeshStandardMaterial;
    const state = stateAt(MOMENTS.lifted, {
      power: { flow: 'none', onboard: 'battery', eddy: true },
    });
    section.setState(state);
    expect(section.animate?.(frame, state)).toBe(true);
    for (let step = 0; step < EASE_FRAMES; step += 1) section.animate?.(frame, state);
    expect(material.emissiveIntensity).toBeGreaterThan(0);
    expect(section.animate?.(frame, state)).toBe(false);
  });
});

describe('train anchors', () => {
  it('parents the anchors under the lifted group', () => {
    const { context, section } = build();
    section.setState(stateAt(0));
    const anchor = context.anchors.nose;
    anchor?.updateWorldMatrix(true, false);
    const position = new Vector3().setFromMatrixPosition(
      anchor?.matrixWorld ?? new Mesh().matrixWorld,
    );
    expect(position.x).toBeCloseTo(TRAIN.noseX, 3);
  });
});
