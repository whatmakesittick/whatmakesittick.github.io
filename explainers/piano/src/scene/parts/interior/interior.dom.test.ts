import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { runNow } from '@core/scene/pacing';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import { REGISTER_IDS } from '../../../ids';
import type { AssemblyState, PartId } from '../../../ids';
import { KNOT_UNITS, PLAYED_KEY, cutX, stringPath } from '../../../model';
import { LOD_DISTANCE } from '../../constants';
import type { Frame, PartContext, Section } from '../context';
import { createCut, setCut } from '../cut';
import { createInterior } from './interior';
import { interiorState } from './testState';

const RINGING = KNOT_UNITS.strike + 20;
const DIGITS = 6;
const NEAR = 1;
const INTERIOR_LABELS: readonly PartId[] = [
  'strings',
  'stringSet',
  'bassStrings',
  'bridge',
  'soundboard',
  'plate',
  'tuningPins',
];

let context: PartContext;
let tracker: ResourceTracker;
let textures: ReturnType<typeof createSceneTextures>;
let interior: Section;

function frame(cameraDistance = NEAR): Frame {
  return { delta: 1 / 60, elapsed: 1, cameraDistance };
}

function apply(state: AssemblyState): void {
  setCut(context.cut, state.view.cutaway, cutX(PLAYED_KEY[state.register]));
  interior.setState(state);
}

function worldOf(object: Object3D): Vector3 {
  interior.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function named(name: string): Object3D {
  const found = interior.root.getObjectByName(name);
  if (!found) throw new Error(`No ${name}`);
  return found;
}

function bands(): InstancedMesh[] {
  const found: InstancedMesh[] = [];
  interior.root.traverse((node) => {
    const group = node.parent?.name;
    if (node instanceof InstancedMesh && (group === 'stringSet' || group === 'bassStrings')) {
      found.push(node);
    }
  });
  return found;
}

function hiddenInstances(): number {
  const matrix = new Matrix4();
  return bands().reduce((sum, mesh) => {
    let hidden = 0;
    for (let index = 0; index < mesh.count; index += 1) {
      mesh.getMatrixAt(index, matrix);
      if (matrix.determinant() === 0) hidden += 1;
    }
    return sum + hidden;
  }, 0);
}

beforeAll(() => {
  tracker = new ResourceTracker();
  textures = createSceneTextures();
  context = {
    materials: new MaterialLibrary(),
    tracker,
    textures,
    labels: new Map(),
    anchors: {},
    cut: createCut(),
  };
  interior = runNow(createInterior(context));
});

afterAll(() => {
  tracker.dispose();
  textures.dispose();
});

describe('interior', () => {
  it('labels every interior part under the group that holds it', () => {
    INTERIOR_LABELS.forEach((id) => {
      const anchor = context.labels.get(id);
      expect(anchor, id).toBeDefined();
      expect(anchor?.parent?.name).toBe(id === 'strings' ? 'strings' : id);
    });
  });

  it('moves the bridge anchor to where the played string crosses the bridge', () => {
    REGISTER_IDS.forEach((register) => {
      apply(interiorState(0, { register }));
      const [x, y, z] = stringPath(PLAYED_KEY[register]).back;
      const at = worldOf(context.anchors.bridge as Object3D);
      expect(at.x).toBeCloseTo(x, DIGITS);
      expect(at.y).toBeCloseTo(y, DIGITS);
      expect(at.z).toBeCloseTo(z, DIGITS);
    });
  });

  it('draws the played unison on its own and hides its instanced copies', () => {
    REGISTER_IDS.forEach((register) => {
      apply(interiorState(0, { register }));
      const shown = named('strings').children.filter(
        (child) => child.name === 'strings' && child.visible,
      );
      expect(shown).toHaveLength(1);
      expect(hiddenInstances()).toBeGreaterThan(0);
    });
  });

  it('caps the cut only while the cutaway is on', () => {
    apply(interiorState(0, { register: 'bass' }));
    expect(named('caps').visible).toBe(false);
    apply(interiorState(0, { register: 'bass', view: { cutaway: true } }));
    expect(named('caps').visible).toBe(true);
    expect(named('caps-bass').visible).toBe(true);
  });

  it('animates exactly while a drawn string rings', () => {
    const quiet = interiorState(RINGING);
    apply(quiet);
    expect(interior.animate?.(frame(), quiet)).toBe(false);
    const ringing = interiorState(RINGING, { view: { wave: true } });
    apply(ringing);
    expect(interior.animate?.(frame(), ringing)).toBe(true);
    const resting = interiorState(0, { view: { wave: true } });
    apply(resting);
    expect(interior.animate?.(frame(), resting)).toBe(false);
  });

  it('thins the string set when the camera is far', () => {
    const state = interiorState(0);
    apply(state);
    const full = bands().map((mesh) => mesh.count);
    interior.animate?.(frame(LOD_DISTANCE.thinStrings + 1), state);
    bands().forEach((mesh, index) => expect(mesh.count).toBeLessThan(full[index]));
    interior.animate?.(frame(), state);
    bands().forEach((mesh, index) => expect(mesh.count).toBe(full[index]));
  });
});
