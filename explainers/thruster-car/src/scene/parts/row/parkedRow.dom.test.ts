import { describe, expect, it } from 'vitest';
import { Box3, Mesh, Vector3 } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import { PARKED_ROW, ROW_TOP } from '../../../model/layout';
import type { PartContext } from '../context';
import { createParkedRow } from './parkedRow';

const DRAW_CALL_LIMIT = 4;
const TOLERANCE = 0.01;

function context(): PartContext {
  return {
    materials: new MaterialLibrary(),
    textures: {} as unknown as SceneTextures,
    tracker: new ResourceTracker(),
  };
}

function meshesOf(object: { traverse(visit: (child: unknown) => void): void }): Mesh[] {
  const meshes: Mesh[] = [];
  object.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child);
  });
  return meshes;
}

describe('createParkedRow', () => {
  const parts = context();
  const row = createParkedRow(parts);
  const meshes = meshesOf(row.object);

  it('draws the whole row in a few meshes of the parked row part', () => {
    expect(meshes.length).toBeLessThanOrEqual(DRAW_CALL_LIMIT);
    meshes.forEach((mesh) => {
      expect(parts.materials.groupOf(mesh.material as never)).toBe('parkedRow');
    });
  });

  it('spans the frozen row on the ground', () => {
    const bounds = new Box3().setFromObject(row.object);
    const starts = PARKED_ROW.map((vehicle) => vehicle.centreX - vehicle.length / 2);
    const ends = PARKED_ROW.map((vehicle) => vehicle.centreX + vehicle.length / 2);
    expect(bounds.min.x).toBeLessThan(Math.min(...starts) + TOLERANCE);
    expect(bounds.max.x).toBeGreaterThan(Math.max(...ends) - TOLERANCE);
    expect(bounds.max.y).toBeLessThanOrEqual(ROW_TOP + TOLERANCE);
    expect(bounds.min.y).toBeGreaterThanOrEqual(-TOLERANCE);
  });

  it('puts the label above the tallest vehicle', () => {
    expect(row.label.parent).toBe(row.object);
    const label = row.label.getWorldPosition(new Vector3());
    expect(label.y).toBeGreaterThan(ROW_TOP);
  });
});
