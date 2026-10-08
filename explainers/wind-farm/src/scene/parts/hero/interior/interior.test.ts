import { InstancedMesh, Mesh } from 'three';
import type { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../../../ids';
import { FINISHES } from '../../../finishes';
import type { Motion, PartContext } from '../../context';
import { FAST_SHAFT_RATIO } from './constants';
import { buildInterior } from './index';

const TRIANGLE_BUDGET = 30_000;
const AZIMUTH = 0.4;

function partContext(): PartContext {
  return {
    materials: new MaterialLibrary(),
    tracker: new ResourceTracker(),
    textures: {} as SceneTextures,
    labels: new Map(),
    anchors: {},
  };
}

function triangles(root: Object3D): number {
  let total = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const { index, attributes } = object.geometry;
    const copies = object instanceof InstancedMesh ? object.count : 1;
    total += ((index ? index.count : attributes.position.count) / 3) * copies;
  });
  return total;
}

function braked(value: boolean): AssemblyState {
  return { rotor: { braked: value } } as AssemblyState;
}

describe('buildInterior', () => {
  it('stays within the triangle budget', () => {
    expect(triangles(buildInterior(partContext()).root)).toBeLessThan(TRIANGLE_BUDGET);
  });

  it('lights the caliper only while the rotor is braked', () => {
    const context = partContext();
    const interior = buildInterior(context);
    const glow = context.materials.get('brakeDisc', FINISHES.brakeGlow);
    const glowing = () => {
      let found = false;
      interior.root.traverse((object) => {
        if (object instanceof Mesh && object.material === glow) found = true;
      });
      return found;
    };
    interior.setState(braked(true));
    expect(glowing()).toBe(true);
    interior.setState(braked(false));
    expect(glowing()).toBe(false);
  });

  it('turns the fast shaft faster than the main shaft, both positively about x', () => {
    const interior = buildInterior(partContext());
    interior.animate({ azimuth: AZIMUTH } as Motion);
    const main = interior.root.getObjectByName('mainShaftSpin');
    const fast = interior.root.getObjectByName('fastShaftSpin');
    expect(main?.rotation.x).toBeCloseTo(AZIMUTH);
    expect(fast?.rotation.x).toBeCloseTo(AZIMUTH * FAST_SHAFT_RATIO);
  });
});
