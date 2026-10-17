import { describe, expect, it } from 'vitest';
import type { Material, Mesh } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import { SEAT } from '../../../model/layout';
import type { PartContext } from '../context';
import { createCabin } from './cabin';
import { createCarLook } from './look';

const MESH_BUDGET = 2;

function context(): PartContext {
  return {
    materials: new MaterialLibrary(),
    textures: {} as unknown as SceneTextures,
    tracker: new ResourceTracker(),
  };
}

describe('createCabin', () => {
  it('draws the seat and the cockpit in one mesh each', () => {
    const parts = context();
    const { object } = createCabin(parts, createCarLook(parts));
    const meshes = object.children as Mesh[];
    const groups = meshes.map((mesh) => parts.materials.groupOf(mesh.material as Material));
    expect(meshes.length).toBeLessThanOrEqual(MESH_BUDGET);
    expect(new Set(groups)).toEqual(new Set(['seat', 'body']));
  });

  it('anchors the seat label under a seat mesh so it hides with it', () => {
    const parts = context();
    const { label } = createCabin(parts, createCarLook(parts));
    const seatMesh = label.parent as Mesh;
    expect(parts.materials.groupOf(seatMesh.material as Material)).toBe('seat');
    expect(label.position.toArray()).toEqual([...SEAT]);
    seatMesh.visible = false;
    expect(isShown(label)).toBe(false);
  });
});
