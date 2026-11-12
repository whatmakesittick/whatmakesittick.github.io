import { describe, expect, it } from 'vitest';
import { Box3, InstancedMesh, Mesh, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { runNow } from '@core/scene/pacing';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../../ids';
import { buildFab } from '../fab';
import { buildSource } from '../source';
import type { PartContext, Section } from '../context';

const TRIANGLE_LIMIT = 40_000;
const DRAW_CALL_LIMIT = 50;
const TRIANGLES_PER_FACE = 3;

function createContext(): PartContext {
  return {
    materials: new MaterialLibrary(),
    tracker: new (class {
      track<T>(resource: T): T {
        return resource;
      }
      dispose(): void {}
    })() as unknown as PartContext['tracker'],
    textures: createSceneTextures(),
    labels: new Map(),
    anchors: {},
  };
}

function meshes(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh) found.push(object);
  });
  return found;
}

function triangles(list: readonly Mesh[]): number {
  return list.reduce((sum, mesh) => {
    const count = mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count;
    const copies = mesh instanceof InstancedMesh ? mesh.count : 1;
    return sum + (count / TRIANGLES_PER_FACE) * copies;
  }, 0);
}

function stateWith(cutaway: boolean): AssemblyState {
  return { view: { cutaway } } as unknown as AssemblyState;
}

function ghosted(list: readonly Mesh[]): Mesh[] {
  return list.filter(
    (mesh) =>
      (mesh.material as Material).transparent && mesh.geometry.getAttribute('position').count > 0,
  );
}

describe('source and fab sections', () => {
  const context = createContext();
  const fab: Section = runNow(buildFab(context));
  const source: Section = runNow(buildSource(context));

  it('registers its labels and the focus anchor', () => {
    ['driveLaser', 'beamTransport', 'vessel', 'collector', 'intermediateFocus'].forEach((id) => {
      expect(context.labels.has(id as never)).toBe(true);
    });
    expect(context.anchors.intermediateFocus).toBeDefined();
  });

  it('keeps each section within the triangle and draw call budgets', () => {
    const stats = [fab, source].map((section) => {
      const list = meshes(section.root);
      return { name: section.root.name, tris: triangles(list), calls: list.length };
    });
    stats.forEach(({ tris, calls }) => {
      expect(tris).toBeLessThan(TRIANGLE_LIMIT);
      expect(calls, JSON.stringify(stats)).toBeLessThan(DRAW_CALL_LIMIT);
    });
  });

  it('swaps the front half materials when the cutaway opens', () => {
    const list = meshes(source.root);
    source.setState(stateWith(false));
    const closed = ghosted(list).length;
    source.setState(stateWith(true));
    const open = ghosted(list).length;
    expect(open).toBeGreaterThan(closed);
  });

  it('puts the cutaway halves on the front side and the solid halves behind', () => {
    source.setState(stateWith(true));
    const box = new Box3();
    ghosted(meshes(source.root)).forEach((mesh) => {
      if (mesh instanceof InstancedMesh) return;
      mesh.geometry.computeBoundingBox();
      box.copy(mesh.geometry.boundingBox as Box3);
      expect(box.max.z).toBeGreaterThan(0);
      expect(box.min.z).toBeGreaterThan(-0.2);
    });
  });

  it('keeps the fab below the floor inside its footprint', () => {
    const limit = new Box3(new Vector3(-9.1, -3.8, -3.1), new Vector3(9.1, 0.1, 3.1));
    meshes(fab.root)
      .filter((mesh) => !(mesh instanceof InstancedMesh))
      .forEach((mesh) => {
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox as Box3;
        expect(Number.isFinite(box.min.x)).toBe(true);
        if (box.max.y <= limit.max.y) expect(limit.containsBox(box)).toBe(true);
      });
  });
});
