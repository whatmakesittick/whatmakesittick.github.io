import { describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, PartId } from '../../../ids';
import { createMagnetModule } from './magnet';

const OWNED: readonly PartId[] = [
  'cover',
  'vacuumVessel',
  'radiationShield',
  'heliumVessel',
  'mainCoils',
  'shieldCoils',
  'shims',
  'coldHead',
  'quenchPipe',
  'gradientX',
  'gradientY',
  'gradientZ',
  'bodyCoil',
  'bore',
];
const TRIANGLE_BUDGET = 250_000;
const FRAME = 1 / 60;

function moduleUnderTest() {
  return createMagnetModule({
    materials: new MaterialLibrary(),
    textures: createSceneTextures(),
    tracker: new ResourceTracker(),
  });
}

function stateWith(cutaway: boolean, level: number): AssemblyState {
  return {
    view: { cutaway, fieldLines: false, voxel: false, labels: true },
    gradientAxis: null,
    sequence: { phase: 0, step: 'rest', rf: null, gradient: 'x', gradientLevel: level, echo: 0 },
  } as unknown as AssemblyState;
}

function triangles(root: Object3D): number {
  let total = 0;
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const count = node.geometry.index?.count ?? node.geometry.getAttribute('position').count;
    total += (count / 3) * (node instanceof InstancedMesh ? node.count : 1);
  });
  return total;
}

describe('magnet module', () => {
  it('names a part object and a label for every owned part', () => {
    const magnet = moduleUnderTest();
    OWNED.forEach((id) => {
      expect(magnet.root.getObjectByName(id)).toBeDefined();
      expect(magnet.labels.get(id)).toBeDefined();
    });
    expect(magnet.anchors.coldHead).toBeDefined();
  });

  it('stays within the triangle budget', () => {
    expect(triangles(moduleUnderTest().root)).toBeLessThan(TRIANGLE_BUDGET);
  });

  it('swaps the closed cover for the cut layers', () => {
    const magnet = moduleUnderTest();
    const visible = (name: string) => magnet.root.getObjectByName(name)?.visible;
    magnet.setState(stateWith(true, 0));
    expect([visible('cover'), visible('coverCut'), visible('mainCoils')]).toEqual([
      false,
      true,
      true,
    ]);
    magnet.setState(stateWith(false, 0));
    expect([visible('cover'), visible('coverCut'), visible('mainCoils')]).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('eases the gradient glow and then settles', () => {
    const magnet = moduleUnderTest();
    magnet.setState(stateWith(true, 1));
    expect(magnet.update(FRAME, 1)).toBe(true);
    let frames = 0;
    while (magnet.update(FRAME, 1)) frames += 1;
    expect(frames).toBeGreaterThan(0);
    expect(magnet.update(FRAME, 1)).toBe(false);
  });
});
