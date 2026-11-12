import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, MeshPhysicalMaterial, Mesh, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { runNow } from '@core/scene/pacing';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ResourceTracker } from '@core/scene/resources';
import type { AssemblyState, PartId } from '../../../ids';
import { BEAM_WAYPOINTS, mirrorSizeM } from '../../../model/layout';
import type { WaypointId } from '../../../model/layout';
import type { PartContext, Section } from '../context';
import { mirrorNormal } from '../kit';
import { buildOptics } from '../optics';

const FRAME = { delta: 1 / 60, elapsed: 0, cameraDistance: 10, cameraPosition: new Vector3() };
const SETTLE_FRAMES = 120;
const CLOSE_M = 1.9;
const TRIANGLE_BUDGET = 80000;
const DRAW_CALL_BUDGET = 70;
const MIRROR_ORDER: Record<string, WaypointId[]> = {
  illuminator: ['i1', 'i2', 'i3', 'i4'],
  projection: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
};

function context(): PartContext {
  return {
    materials: new MaterialLibrary(),
    tracker: new ResourceTracker(),
    textures: createSceneTextures(),
    labels: new Map(),
    anchors: {},
  };
}

function stateOf(optics: 'na033' | 'na055', cutaway = true): AssemblyState {
  return {
    phase: 0,
    playing: false,
    machine: optics === 'na033' ? 'nxe3600d' : 'ehx5200',
    optics,
    flash: { position: [0, 0, 0], span: 1 },
    light: { left: 0, bounces: 0 },
    inset: 0,
    scan: 0,
    view: { beam: true, labels: true, cutaway, inset: true, follow: false },
  } as unknown as AssemblyState;
}

function meshes(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((child) => child instanceof Mesh && found.push(child));
  return found;
}

function faceOf(section: Section, part: PartId): InstancedMesh {
  const face = meshes(section.root).find(
    (target) =>
      target.parent?.name === part &&
      target instanceof InstancedMesh &&
      target.material instanceof MeshPhysicalMaterial,
  );
  if (!(face instanceof InstancedMesh)) throw new Error('No mirror faces');
  return face;
}

function normalAt(face: InstancedMesh, index: number): Vector3 {
  const matrix = new Matrix4();
  face.getMatrixAt(index, matrix);
  const rotation = new Quaternion();
  matrix.decompose(new Vector3(), rotation, new Vector3());
  return new Vector3(0, 1, 0).applyQuaternion(rotation);
}

function scaleAt(face: InstancedMesh, index: number): number {
  const matrix = new Matrix4();
  face.getMatrixAt(index, matrix);
  return new Vector3().setFromMatrixScale(matrix).x;
}

function triangles(root: Object3D): number {
  return meshes(root).reduce((sum, target) => {
    const count = target.geometry.index?.count ?? target.geometry.attributes.position.count;
    return sum + (count / 3) * (target instanceof InstancedMesh ? target.count : 1);
  }, 0);
}

describe('optics section', () => {
  const ctx = context();
  const section = runNow(buildOptics(ctx));
  section.setState(stateOf('na033'));

  it('labels both parts', () => {
    expect(ctx.labels.has('illuminator')).toBe(true);
    expect(ctx.labels.has('projection')).toBe(true);
  });

  it('points every mirror face along the bisector of the beam legs', () => {
    (['illuminator', 'projection'] as const).forEach((part) => {
      const face = faceOf(section, part);
      MIRROR_ORDER[part].forEach((id, index) => {
        const at = BEAM_WAYPOINTS.findIndex((entry) => entry.id === id);
        const [previous, here, next] = [-1, 0, 1].map((step) => BEAM_WAYPOINTS[at + step].point);
        const expected = mirrorNormal(previous, here, next);
        expect(normalAt(face, index).distanceTo(expected)).toBeLessThan(1e-4);
        expect(scaleAt(face, index)).toBeCloseTo(mirrorSizeM(id, 'na033'), 5);
      });
    });
  });

  it('grows the last projection mirror with the high numerical aperture', () => {
    const face = faceOf(section, 'projection');
    section.setState(stateOf('na055'));
    expect(section.animate?.(FRAME, stateOf('na055'))).toBe(true);
    expect(scaleAt(face, 5)).toBeLessThan(mirrorSizeM('p6', 'na055'));
    let moving = true;
    for (let frame = 0; frame < SETTLE_FRAMES && moving; frame += 1) {
      moving = section.animate?.(FRAME, stateOf('na055')) ?? false;
    }
    expect(moving).toBe(false);
    expect(scaleAt(face, 5)).toBeCloseTo(mirrorSizeM('p6', 'na055'), 3);
    section.setState(stateOf('na033'));
  });

  it('opens the covers in close views and keeps the far views whole', () => {
    const shown = () => meshes(section.root).filter((target) => isShown(target)).length;
    const whole = shown();
    expect(section.animate?.({ ...FRAME, cameraDistance: CLOSE_M }, stateOf('na033'))).toBe(true);
    expect(shown()).toBeLessThan(whole);
    expect(isShown(faceOf(section, 'projection'))).toBe(false);
    expect(isShown(faceOf(section, 'illuminator'))).toBe(true);
    section.animate?.(FRAME, stateOf('na033'));
    expect(shown()).toBe(whole);
  });

  it('stays inside the triangle and draw call budgets', () => {
    expect(triangles(section.root)).toBeLessThan(TRIANGLE_BUDGET);
    expect(meshes(section.root).length).toBeLessThan(DRAW_CALL_BUDGET);
  });
});
