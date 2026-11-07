import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { InstancedMesh, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS, REGISTER_IDS } from '../ids';
import type { AssemblyState, PartId, PedalId, RegisterId, TouchId, ViewOptions } from '../ids';
import {
  MOMENTS,
  PLAYED_KEY,
  STRING_Y,
  actionPoseAt,
  harpsichordPoseAt,
  keyX,
  strokeReadingAt,
  uprightPoseAt,
} from '../model';
import { chaseTargetFor, hammerHeadTop } from './pose';
import { PlaceholderAssembly, createPlaceholderAssembly } from './placeholderAssembly';

const FRAME = 1 / 60;
const DIGITS = 6;
const RINGING_UNITS = 600;
const ALL_VIEWS: ViewOptions = {
  sound: false,
  wave: true,
  inset: true,
  ghost: true,
  follow: false,
  labels: true,
  cutaway: true,
  lineUp: true,
};

interface Choices {
  touch?: TouchId;
  pedal?: PedalId;
  register?: RegisterId;
  view?: Partial<ViewOptions>;
}

function stateAt(units: number, choices: Choices = {}): AssemblyState {
  const { touch = 'medium', pedal = 'none', register = 'middle', view = {} } = choices;
  return {
    phase: units,
    playing: false,
    touch,
    pedal,
    register,
    compare: 'grand',
    stroke: strokeReadingAt(units, touch, pedal, register),
    action: actionPoseAt(units, touch, pedal, register),
    upright: uprightPoseAt(units, touch, pedal, register),
    harpsichord: harpsichordPoseAt(units, touch, register),
    view: { ...ALL_VIEWS, ...view },
  };
}

let materials: MaterialLibrary;
let textures: ReturnType<typeof createSceneTextures>;
let assembly: PlaceholderAssembly;

function worldOf(object: Object3D): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function label(id: PartId): Object3D {
  const anchor = assembly.labelAnchors().get(id);
  if (!anchor) throw new Error(`No label for ${id}`);
  return anchor;
}

function onDispose(resource: { addEventListener(type: 'dispose', listener: () => void): void }) {
  const freed = { done: false };
  resource.addEventListener('dispose', () => (freed.done = true));
  return freed;
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = new PlaceholderAssembly({ materials, textures }, stateAt(0));
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
  materials.dispose();
});

describe('placeholder assembly', () => {
  it('anchors every part, names every anchor and spans every region', () => {
    expect([...assembly.labelAnchors().keys()].sort()).toEqual([...PART_IDS].sort());
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
  });

  it('lifts the hammer anchor to the string at the strike', () => {
    const state = stateAt(MOMENTS.strike);
    assembly.setState(state);
    const head = worldOf(assembly.anchor('hammer'));
    expect(head.y).toBeCloseTo(STRING_Y, DIGITS);
    hammerHeadTop(PLAYED_KEY.middle, state.action).forEach((value, axis) =>
      expect(head.getComponent(axis)).toBeCloseTo(value, DIGITS),
    );
    expect(worldOf(label('hammer')).y).toBeCloseTo(STRING_Y, DIGITS);
  });

  it('moves the detailed action and its regions to the played key', () => {
    REGISTER_IDS.forEach((register) => {
      assembly.setState(stateAt(0, { register }));
      expect(worldOf(assembly.anchor('key')).x).toBeCloseTo(keyX(PLAYED_KEY[register]), DIGITS);
      expect(worldOf(label('jack')).x).toBeCloseTo(keyX(PLAYED_KEY[register]), DIGITS);
      const region = assembly.region('action');
      expect(region.containsPoint(worldOf(assembly.anchor('jack')))).toBe(true);
    });
  });

  it('hides the drawings whose view flags are off', () => {
    const drawings: readonly [Partial<ViewOptions>, PartId][] = [
      [{ inset: false }, 'inset'],
      [{ ghost: false, lineUp: false }, 'upright'],
      [{ lineUp: false }, 'harpsichord'],
    ];
    drawings.forEach(([off, id]) => {
      assembly.setState(stateAt(0));
      expect(isShown(label(id))).toBe(true);
      assembly.setState(stateAt(0, { view: off }));
      expect(isShown(label(id))).toBe(false);
    });
    assembly.setState(stateAt(0, { view: { ghost: false } }));
    expect(isShown(label('upright'))).toBe(true);
  });

  it('draws no damper on the treble note', () => {
    assembly.setState(stateAt(0, { register: 'treble' }));
    expect(isShown(label('damper'))).toBe(false);
    assembly.setState(stateAt(0));
    expect(isShown(label('damper'))).toBe(true);
  });

  it('animates only while a ringing string is drawn under the wave view', () => {
    assembly.setState(stateAt(RINGING_UNITS));
    expect(assembly.update(FRAME, 1)).toBe(true);
    assembly.setState(stateAt(RINGING_UNITS, { view: { wave: false, lineUp: false } }));
    expect(assembly.update(FRAME, 1)).toBe(false);
    assembly.setState(stateAt(0, { view: { lineUp: false } }));
    expect(assembly.update(FRAME, 1)).toBe(false);
  });

  it('chases the hammer head', () => {
    const state = stateAt(MOMENTS.letOff);
    assembly.setState(state);
    expect(assembly.chaseTarget()).toEqual(chaseTargetFor(PLAYED_KEY.middle, state.action));
  });

  it('frees its geometries, instance buffers and registered materials on dispose', () => {
    const library = new MaterialLibrary();
    const register = vi.spyOn(library, 'register');
    const extra = createPlaceholderAssembly({ materials: library, textures }, stateAt(0));
    const geometries = new Set<BufferGeometry>();
    const instanced: InstancedMesh[] = [];
    extra.root.traverse((object) => {
      if (object instanceof Mesh) geometries.add(object.geometry);
      if (object instanceof InstancedMesh) instanced.push(object);
    });
    const registeredMaterials = register.mock.calls.map(([, material]) => material);
    const freed = [...geometries, ...registeredMaterials, ...instanced].map(onDispose);
    expect(() => extra.dispose()).not.toThrow();
    expect(extra.root.parent).toBeNull();
    expect(registeredMaterials.length).toBeGreaterThan(0);
    expect(freed.every(({ done }) => done)).toBe(true);
    library.dispose();
  });
});
