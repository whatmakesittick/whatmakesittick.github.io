import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { InstancedMesh, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, PartId, ViewOptions } from '../ids';
import {
  ANCHOR_POINTS,
  LIFT_TRAVEL_MM,
  MOMENTS,
  SECTION_M,
  VIEW_AHEAD_M,
  mm,
  motionAt,
} from '../model';
import { chaseTargetFor } from './pose';
import { PlaceholderAssembly, createPlaceholderAssembly, stationName } from './placeholderAssembly';

const FRAME = 1 / 60;
const SETTLED_SECONDS = 2;
const GHOST_LAG_M = 200;
const NEAR_M = 1;
const POSITION_DIGITS = 6;
const UNITS = { resting: 0, lifted: MOMENTS.lifted, cruise: MOMENTS.fullSpeed } as const;
const ALL_VIEWS: ViewOptions = {
  wave: true,
  gap: true,
  ghost: true,
  labels: true,
  cutaway: false,
  lineUp: true,
};

function stateAt(units: number, view: Partial<ViewOptions> = {}, token = 0): AssemblyState {
  const motion = motionAt(units, 'kmh430', 'regen');
  const sectionIndex = Math.floor(motion.distance / SECTION_M);
  return {
    phase: units,
    playing: false,
    topSpeed: 'kmh430',
    brakeMode: 'regen',
    motion,
    wave: {
      on: true,
      reversed: false,
      hz: 0,
      sectionIndex,
      nextSectionIndex: sectionIndex + 1,
      sectionStart: sectionIndex * SECTION_M,
      sectionEnd: (sectionIndex + 1) * SECTION_M,
    },
    power: { flow: 'none', onboard: 'rails', eddy: false },
    ghost: { distance: motion.distance - GHOST_LAG_M, speedKmh: 0, behind: GHOST_LAG_M },
    nudge: { id: token > 0 ? 'bump' : null, token },
    compare: 'transrapid',
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

function station(): Object3D {
  const found = assembly.root.getObjectByName(stationName('longyangRoad'));
  if (!found) throw new Error('No Longyang Road station');
  return found;
}

function onDispose(resource: { addEventListener(type: 'dispose', listener: () => void): void }) {
  const freed = { done: false };
  resource.addEventListener('dispose', () => (freed.done = true));
  return freed;
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = new PlaceholderAssembly({ materials, textures }, stateAt(UNITS.resting));
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

  it('puts the anchors on their layout points once the train floats', () => {
    assembly.setState(stateAt(UNITS.lifted));
    ANCHOR_IDS.forEach((id) => {
      const spot = worldOf(assembly.anchor(id)).toArray();
      spot.forEach((value, axis) =>
        expect(value).toBeCloseTo(ANCHOR_POINTS[id][axis], POSITION_DIGITS),
      );
    });
  });

  it('sets the train down by the lift travel when it rests on its skids', () => {
    assembly.setState(stateAt(UNITS.resting));
    const resting = worldOf(assembly.anchor('nose')).y;
    const restingRegion = assembly.region('train').max.y;
    assembly.setState(stateAt(UNITS.lifted));
    const floating = worldOf(assembly.anchor('nose')).y;
    expect(resting).toBeLessThan(floating);
    expect(floating - resting).toBeCloseTo(mm(LIFT_TRAVEL_MM), POSITION_DIGITS);
    expect(assembly.region('train').max.y - restingRegion).toBeCloseTo(
      mm(LIFT_TRAVEL_MM),
      POSITION_DIGITS,
    );
  });

  it('slides the stations past with the line', () => {
    assembly.setState(stateAt(UNITS.resting));
    expect(Math.abs(worldOf(station()).x)).toBeLessThan(NEAR_M);
    expect(isShown(station())).toBe(true);
    assembly.setState(stateAt(UNITS.cruise));
    expect(Math.abs(worldOf(station()).x)).toBeGreaterThan(VIEW_AHEAD_M);
    expect(isShown(station())).toBe(false);
  });

  it('keeps the ghost behind by its lag on its own track', () => {
    assembly.setState(stateAt(UNITS.cruise));
    expect(worldOf(label('ghostTrain')).x).toBeCloseTo(-GHOST_LAG_M, POSITION_DIGITS);
    expect(isShown(label('ghostTrain'))).toBe(true);
  });

  it('hides the drawings whose view flags are off', () => {
    const drawings: readonly [keyof ViewOptions, PartId][] = [
      ['lineUp', 'scmaglev'],
      ['lineUp', 'wheelRail'],
      ['ghost', 'ghostTrain'],
      ['gap', 'gapInset'],
      ['wave', 'poweredSection'],
    ];
    drawings.forEach(([flag, id]) => {
      assembly.setState(stateAt(UNITS.lifted));
      expect(isShown(label(id))).toBe(true);
      assembly.setState(stateAt(UNITS.lifted, { [flag]: false }));
      expect(isShown(label(id))).toBe(false);
    });
  });

  it('follows the train with the chase target', () => {
    const state = stateAt(UNITS.resting);
    assembly.setState(state);
    expect(assembly.chaseTarget()).toEqual(chaseTargetFor(state.motion));
  });

  it('animates only while a nudge settles', () => {
    assembly.setState(stateAt(UNITS.lifted));
    expect(assembly.update(FRAME)).toBe(false);
    assembly.setState(stateAt(UNITS.lifted, {}, 1));
    expect(assembly.update(FRAME)).toBe(true);
    expect(assembly.update(SETTLED_SECONDS)).toBe(false);
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
