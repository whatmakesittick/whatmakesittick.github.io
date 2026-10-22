import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { InstancedMesh, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS, VIEW_IDS } from '../ids';
import type { AssemblyState, NudgeId, PartId, ViewId, ViewOptions } from '../ids';
import { ANCHOR_POINTS, MOMENTS, SECTION_M, mm, motionAt } from '../model';
import type { Assembly } from './assembly';
import { NUDGE } from './constants';
import { createMaglevTrainAssembly } from './maglevTrainAssembly';
import { chaseTargetFor } from './pose';

const FRAME = 1 / 60;
const SETTLED_SECONDS = 4;
const POSITION_DIGITS = 3;
const ALL_VIEWS: ViewOptions = {
  wave: true,
  gap: true,
  ghost: true,
  labels: true,
  cutaway: false,
  lineUp: true,
};
const QUIET_VIEWS: ViewOptions = {
  wave: false,
  gap: false,
  ghost: false,
  labels: true,
  cutaway: false,
  lineUp: false,
};
const FLAGGED_PARTS: readonly (readonly [ViewId, PartId])[] = [
  ['gap', 'gapInset'],
  ['ghost', 'ghostTrain'],
  ['lineUp', 'scmaglev'],
  ['lineUp', 'wheelRail'],
  ['lineUp', 'gapCallouts'],
  ['wave', 'poweredSection'],
];

interface Nudge {
  id: NudgeId | null;
  token: number;
}

function stateAt(
  units: number,
  view: Partial<ViewOptions> = {},
  nudge: Nudge = { id: null, token: 0 },
): AssemblyState {
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
      nextSectionIndex: null,
      sectionStart: sectionIndex * SECTION_M,
      sectionEnd: (sectionIndex + 1) * SECTION_M,
    },
    power: { flow: 'none', onboard: 'rails', eddy: false },
    ghost: { distance: motion.distance, speedKmh: 0, behind: 0 },
    nudge,
    compare: 'transrapid',
    view: { ...ALL_VIEWS, ...view },
  };
}

let materials: MaterialLibrary;
let textures: ReturnType<typeof createSceneTextures>;
let assembly: Assembly;

function worldOf(object: Object3D): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function labelShown(id: PartId): boolean {
  const anchor = assembly.labelAnchors().get(id);
  if (!anchor) throw new Error(`No label for ${id}`);
  return isShown(anchor);
}

function settle(state: AssemblyState): void {
  assembly.setState(state);
  assembly.update(SETTLED_SECONDS, 0);
}

function onDispose(resource: { addEventListener(type: 'dispose', listener: () => void): void }) {
  const freed = { done: false };
  resource.addEventListener('dispose', () => (freed.done = true));
  return freed;
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = createMaglevTrainAssembly({ materials, textures }, stateAt(0));
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
  materials.dispose();
});

describe('maglev train assembly', () => {
  it('anchors every part, names every anchor and spans every region', () => {
    expect(PART_IDS.filter((id) => !assembly.labelAnchors().has(id))).toEqual([]);
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id), id).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty(), id).toBe(false));
  });

  it('puts the scene anchors on their layout points once the train floats', () => {
    settle(stateAt(MOMENTS.lifted));
    ANCHOR_IDS.forEach((id) =>
      worldOf(assembly.anchor(id))
        .toArray()
        .forEach((value, axis) =>
          expect(value, id).toBeCloseTo(ANCHOR_POINTS[id][axis], POSITION_DIGITS),
        ),
    );
  });

  it('takes every view flag on and off and keeps every label', () => {
    VIEW_IDS.forEach((flag) =>
      [true, false].forEach((on) => {
        expect(() => settle(stateAt(MOMENTS.lifted, { [flag]: on }))).not.toThrow();
        expect(assembly.labelAnchors().size).toBe(PART_IDS.length);
      }),
    );
  });

  it('hides the drawings whose view flags are off', () => {
    FLAGGED_PARTS.forEach(([flag, id]) => {
      settle(stateAt(MOMENTS.lifted));
      expect(labelShown(id), id).toBe(true);
      settle(stateAt(MOMENTS.lifted, { [flag]: false }));
      expect(labelShown(id), id).toBe(false);
    });
  });

  it('stops animating once paused and idle', () => {
    settle(stateAt(0, QUIET_VIEWS));
    expect(assembly.update(FRAME, 0)).toBe(false);
  });

  it('animates while a nudge settles and shifts the chase target with a gust', () => {
    const still = stateAt(MOMENTS.lifted, QUIET_VIEWS);
    settle(still);
    expect(assembly.chaseTarget()).toEqual(chaseTargetFor(still.motion));
    assembly.setState(stateAt(MOMENTS.lifted, QUIET_VIEWS, { id: 'gust', token: 1 }));
    expect(assembly.update(FRAME, 0)).toBe(true);
    expect(Math.abs(assembly.chaseTarget().position[2])).toBeGreaterThan(0);
    expect(Math.abs(assembly.chaseTarget().position[2])).toBeLessThanOrEqual(
      mm(NUDGE.gustLateralMm),
    );
    assembly.update(SETTLED_SECONDS, 0);
    expect(assembly.update(FRAME, 0)).toBe(false);
    expect(assembly.chaseTarget()).toEqual(chaseTargetFor(still.motion));
  });

  it('warms up only hidden drawables, one per material', () => {
    settle(stateAt(0, QUIET_VIEWS));
    const compile = vi.fn<(object: Object3D) => void>();
    assembly.warmUp?.(compile);
    const compiled = compile.mock.calls.map(([object]) => object);
    expect(compiled.every((object) => !isShown(object))).toBe(true);
    const materialsSeen = compiled.map((object) => (object as Mesh).material);
    expect(new Set(materialsSeen).size).toBe(materialsSeen.length);
  });

  it('frees its geometries, instance buffers and registered materials on dispose', () => {
    const library = new MaterialLibrary();
    const register = vi.spyOn(library, 'register');
    const extra = createMaglevTrainAssembly({ materials: library, textures }, stateAt(0));
    const geometries = new Set<BufferGeometry>();
    const instanced: InstancedMesh[] = [];
    extra.root.traverse((object) => {
      if (object instanceof Mesh) geometries.add(object.geometry);
      if (object instanceof InstancedMesh) instanced.push(object);
    });
    const registered = register.mock.calls.map(([, material]) => material);
    const freed = [...geometries, ...registered, ...instanced].map(onDispose);
    expect(() => extra.dispose()).not.toThrow();
    expect(freed.every(({ done }) => done)).toBe(true);
    library.dispose();
  });
});
