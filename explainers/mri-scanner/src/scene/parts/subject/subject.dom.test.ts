import { describe, expect, it } from 'vitest';
import { Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import { HEAD_COIL, PATIENT, TABLE } from '../../../model/layout';
import { blanketHeight, createSubjectModule } from './subject';

const TRIANGLE_BUDGET = 40000;

function subject() {
  return createSubjectModule({
    materials: new MaterialLibrary(),
    textures: createSceneTextures(),
    tracker: new ResourceTracker(),
  });
}

function triangles(root: Object3D): number {
  let sum = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const { index, attributes } = object.geometry;
    sum += (index ? index.count : attributes.position.count) / 3;
  });
  return sum;
}

describe('subject module', () => {
  it('names the table, the patient and the head coil and anchors the coil at its centre', () => {
    const module = subject();
    ['table', 'patient', 'headCoil'].forEach((name) =>
      expect(module.root.getObjectByName(name)).toBeDefined(),
    );
    const anchor = module.anchors.headCoil as Object3D;
    anchor.updateWorldMatrix(true, false);
    expect(anchor.getWorldPosition(new Vector3()).toArray()).toEqual([...HEAD_COIL.centre]);
    expect([...module.labels.keys()]).toEqual(['table', 'patient', 'headCoil']);
    expect(module.update(0.016, 5)).toBe(false);
  });

  it('lays the blanket over the body and lets it fall past the cradle edge', () => {
    expect(blanketHeight(0, 0.5)).toBeGreaterThan(TABLE.top + 0.15);
    expect(blanketHeight(0, PATIENT.feetZ)).toBeGreaterThan(TABLE.top + 0.1);
    expect(blanketHeight(0.29, 1)).toBeLessThan(TABLE.top);
  });

  it('stays within a moderate triangle budget', () => {
    expect(triangles(subject().root)).toBeLessThan(TRIANGLE_BUDGET);
  });
});
