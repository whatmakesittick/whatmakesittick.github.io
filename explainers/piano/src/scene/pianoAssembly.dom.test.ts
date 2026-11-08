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
import type { Assembly } from './assembly';
import { createPianoAssembly } from './pianoAssembly';
import { chaseTargetFor, hammerHeadTop } from './pose';

const FRAME = 1 / 60;
const SETTLE_SECONDS = 2;
const DIGITS = 6;
const RINGING_UNITS = 600;
const STILL_VIEWS: ViewOptions = {
  sound: false,
  wave: false,
  inset: false,
  ghost: false,
  follow: false,
  labels: true,
  cutaway: true,
  lineUp: false,
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
    view: { ...STILL_VIEWS, ...view },
  };
}

let materials: MaterialLibrary;
let textures: ReturnType<typeof createSceneTextures>;
let assembly: Assembly;

function worldOf(object: Object3D): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function label(id: PartId): Object3D {
  const anchor = assembly.labelAnchors().get(id);
  if (!anchor) throw new Error(`No label for ${id}`);
  return anchor;
}

function pressedPedals(): number {
  return label('pedals').parent?.children.filter(({ rotation }) => rotation.x > 0).length ?? 0;
}

function settle(state: AssemblyState): void {
  assembly.setState(state);
  assembly.update(SETTLE_SECONDS, 1);
}

function onDispose(resource: { addEventListener(type: 'dispose', listener: () => void): void }) {
  const freed = { done: false };
  resource.addEventListener('dispose', () => (freed.done = true));
  return freed;
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = createPianoAssembly({ materials, textures }, stateAt(0));
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
  materials.dispose();
});

describe('piano assembly', () => {
  it('labels every part, names every anchor and spans every region', () => {
    expect([...assembly.labelAnchors().keys()].sort()).toEqual([...PART_IDS].sort());
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
  });

  it('moves the anchors and regions to the played key', () => {
    REGISTER_IDS.forEach((register) => {
      settle(stateAt(0, { register }));
      expect(worldOf(assembly.anchor('key')).x).toBeCloseTo(keyX(PLAYED_KEY[register]), DIGITS);
      expect(assembly.region('action').containsPoint(worldOf(assembly.anchor('jack')))).toBe(true);
      expect(assembly.region('dampers').containsPoint(worldOf(assembly.anchor('damper')))).toBe(
        true,
      );
    });
  });

  it('grows the action region with the ghost and the escapement region with the inset', () => {
    settle(stateAt(0));
    const action = assembly.region('action').clone();
    const escapement = assembly.region('escapement').clone();
    settle(stateAt(0, { view: { ghost: true, inset: true } }));
    expect(assembly.region('action').containsBox(action)).toBe(true);
    expect(assembly.region('action').equals(action)).toBe(false);
    expect(assembly.region('escapement').containsBox(escapement)).toBe(true);
    expect(assembly.region('escapement').equals(escapement)).toBe(false);
    settle(stateAt(0, { view: { lineUp: true } }));
    expect(assembly.region('action').containsBox(action)).toBe(true);
  });

  it('hides the drawings whose view flags are off', () => {
    const drawings: readonly [Partial<ViewOptions>, PartId][] = [
      [{ inset: true }, 'inset'],
      [{ ghost: true }, 'upright'],
      [{ lineUp: true }, 'upright'],
      [{ lineUp: true }, 'harpsichord'],
    ];
    drawings.forEach(([on, id]) => {
      settle(stateAt(0, { view: on }));
      expect(isShown(label(id))).toBe(true);
      settle(stateAt(0));
      expect(isShown(label(id))).toBe(false);
    });
  });

  it('draws no damper on the treble note', () => {
    settle(stateAt(0, { register: 'treble' }));
    expect(isShown(label('damper'))).toBe(false);
    settle(stateAt(0));
    expect(isShown(label('damper'))).toBe(true);
  });

  it('presses the right pedal with sustain and the left with una corda', () => {
    settle(stateAt(0));
    expect(pressedPedals()).toBe(0);
    assembly.setState(stateAt(0, { pedal: 'sustain' }));
    expect(assembly.update(FRAME, 1)).toBe(true);
    assembly.update(SETTLE_SECONDS, 1);
    expect(pressedPedals()).toBe(1);
    expect(assembly.update(FRAME, 1)).toBe(false);
    settle(stateAt(0, { pedal: 'unaCorda' }));
    expect(pressedPedals()).toBe(1);
    settle(stateAt(0));
    expect(pressedPedals()).toBe(0);
  });

  it('keeps animating while the una corda pedal and shift ease', () => {
    settle(stateAt(0));
    assembly.setState(stateAt(0, { pedal: 'unaCorda' }));
    expect(assembly.update(FRAME, 1)).toBe(true);
    assembly.update(SETTLE_SECONDS, 1);
    expect(assembly.update(FRAME, 1)).toBe(false);
    settle(stateAt(0));
  });

  it('rests when nothing moves', () => {
    settle(stateAt(0));
    expect(assembly.update(FRAME, 1)).toBe(false);
  });

  it('animates while a ringing string is drawn under the wave view', () => {
    settle(stateAt(RINGING_UNITS, { view: { wave: true } }));
    expect(assembly.update(FRAME, 1)).toBe(true);
    settle(stateAt(RINGING_UNITS));
    expect(assembly.update(FRAME, 1)).toBe(false);
  });

  it('lifts the hammer anchor to the string at the strike', () => {
    const state = stateAt(MOMENTS.strike);
    settle(state);
    const head = worldOf(assembly.anchor('hammer'));
    expect(head.y).toBeCloseTo(STRING_Y, DIGITS);
    hammerHeadTop(PLAYED_KEY.middle, state.action).forEach((value, axis) =>
      expect(head.getComponent(axis)).toBeCloseTo(value, DIGITS),
    );
  });

  it('chases the hammer head', () => {
    const state = stateAt(MOMENTS.letOff);
    assembly.setState(state);
    expect(assembly.chaseTarget()).toEqual(chaseTargetFor(PLAYED_KEY.middle, state.action));
  });

  it('compiles its hidden drawings on warm up', () => {
    const compile = vi.fn();
    expect(() => assembly.warmUp?.(compile)).not.toThrow();
  });

  it('frees its geometries, instance buffers and registered materials on dispose', () => {
    const library = new MaterialLibrary();
    const register = vi.spyOn(library, 'register');
    const extra = createPianoAssembly({ materials: library, textures }, stateAt(0));
    const parent = new Mesh();
    parent.add(extra.root);
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
