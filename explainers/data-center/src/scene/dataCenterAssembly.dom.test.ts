import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { InstancedMesh, Matrix4, Mesh, Sphere, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, COOLING_IDS, PART_IDS, REGION_IDS, VIEW_IDS } from '../ids';
import type { AssemblyState, CoolingId, PartId, ViewId, ViewOptions } from '../ids';
import { ANCHOR_POINTS, MOMENTS, REGION_SPECS, jouleAt } from '../model';
import type { FixedAnchorId } from '../model';
import type { Assembly } from './assembly';
import { OUTAGE_DRILL } from './constants';
import { createDataCenterAssembly } from './dataCenterAssembly';

const FRAME = 1 / 60;
const CAMERA_DISTANCE = 20;
const SETTLED_SECONDS = 4;
const POSITION_DIGITS = 6;
const BOUNDS_TOLERANCE = 1e-3;
const UNITS = { start: 0, inHall: 400, atChip: MOMENTS.becomesHeat, onRoof: 900 } as const;
const ALL_VIEWS: ViewOptions = {
  power: true,
  heat: true,
  packets: true,
  labels: true,
  cutaway: false,
  follow: false,
  inset: true,
  lineUp: true,
};
const QUIET_VIEWS: Partial<ViewOptions> = { power: false, heat: false, packets: false };
const FLAGGED_PARTS: readonly (readonly [ViewId, PartId])[] = [
  ['inset', 'chipInset'],
  ['lineUp', 'laptop'],
];

function stateAt(
  units: number,
  cooling: CoolingId = 'liquid',
  view: Partial<ViewOptions> = {},
  token = 0,
): AssemblyState {
  return {
    phase: units,
    playing: false,
    cooling,
    load: 'full',
    joule: jouleAt(units, cooling),
    rack: { rackKw: 120, hallMw: 23.04, fanShare: 0.6 },
    coolant: {
      medium: cooling === 'air' ? 'air' : 'water',
      supplyC: 25,
      returnC: 45,
      flowShare: 1,
    },
    outage: { token },
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
  assembly.update(SETTLED_SECONDS, CAMERA_DISTANCE);
}

function instancesOutside(mesh: InstancedMesh): number[] {
  const bounds = mesh.boundingSphere;
  if (!bounds) return [-1];
  const geometry = mesh.geometry;
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const local = geometry.boundingSphere ?? new Sphere();
  const matrix = new Matrix4();
  const sphere = new Sphere();
  const slack = BOUNDS_TOLERANCE * Math.max(1, bounds.radius);
  return Array.from({ length: mesh.count }, (_, index) => index).filter((index) => {
    mesh.getMatrixAt(index, matrix);
    sphere.copy(local).applyMatrix4(matrix);
    return sphere.center.distanceTo(bounds.center) + sphere.radius > bounds.radius + slack;
  });
}

function onDispose(resource: { addEventListener(type: 'dispose', listener: () => void): void }) {
  const freed = { done: false };
  resource.addEventListener('dispose', () => (freed.done = true));
  return freed;
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = createDataCenterAssembly({ materials, textures }, stateAt(UNITS.start));
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
  materials.dispose();
});

describe('data center assembly', () => {
  it('anchors every part, names every anchor and spans every region', () => {
    expect(PART_IDS.filter((id) => !assembly.labelAnchors().has(id))).toEqual([]);
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id), id).toBeDefined());
    REGION_IDS.forEach((id) => {
      const box = assembly.region(id);
      expect(box.isEmpty(), id).toBe(false);
      expect(box.min.x).toBe(REGION_SPECS[id].x[0]);
      expect(box.max.y).toBe(REGION_SPECS[id].y[1]);
    });
  });

  it('puts the fixed anchors on their layout points', () => {
    (Object.keys(ANCHOR_POINTS) as FixedAnchorId[]).forEach((id) =>
      worldOf(assembly.anchor(id))
        .toArray()
        .forEach((value, axis) =>
          expect(value, id).toBeCloseTo(ANCHOR_POINTS[id][axis], POSITION_DIGITS),
        ),
    );
  });

  it('moves the joule anchor and label to the joule on every state', () => {
    [UNITS.start, UNITS.inHall, UNITS.atChip, UNITS.onRoof].forEach((units) => {
      const state = stateAt(units);
      settle(state);
      const label = assembly.labelAnchors().get('joule');
      [assembly.anchor('joule'), label].forEach((object) => {
        if (!object) throw new Error('No joule label');
        worldOf(object)
          .toArray()
          .forEach((value, axis) =>
            expect(value).toBeCloseTo(state.joule.position[axis], POSITION_DIGITS),
          );
      });
    });
  });

  it('swaps the cooling plant with each cooling', () => {
    COOLING_IDS.forEach((cooling) => {
      settle(stateAt(UNITS.inHall, cooling));
      const air = cooling === 'air';
      expect(labelShown('airHandlers'), cooling).toBe(air);
      expect(labelShown('cdu'), cooling).toBe(!air);
      expect(labelShown('manifold'), cooling).toBe(!air);
      expect(assembly.labelAnchors().size).toBe(PART_IDS.length);
    });
  });

  it('takes every view flag on and off and keeps every label', () => {
    VIEW_IDS.forEach((flag) =>
      [true, false].forEach((on) => {
        expect(() => settle(stateAt(UNITS.inHall, 'liquid', { [flag]: on }))).not.toThrow();
        expect(assembly.labelAnchors().size).toBe(PART_IDS.length);
      }),
    );
  });

  it('hides the drawings whose view flags are off', () => {
    FLAGGED_PARTS.forEach(([flag, id]) => {
      settle(stateAt(UNITS.inHall));
      expect(labelShown(id), id).toBe(true);
      settle(stateAt(UNITS.inHall, 'liquid', { [flag]: false }));
      expect(labelShown(id), id).toBe(false);
    });
  });

  it('bounds every culled instanced mesh around all of its instances', () => {
    const loose: string[] = [];
    COOLING_IDS.forEach((cooling) =>
      [false, true].forEach((cutaway) => {
        settle(stateAt(UNITS.inHall, cooling, { cutaway }));
        assembly.root.traverse((object) => {
          if (!(object instanceof InstancedMesh) || !object.frustumCulled) return;
          if (instancesOutside(object).length > 0)
            loose.push(`${object.parent?.name}/${object.name}`);
        });
      }),
    );
    expect(loose).toEqual([]);
  });

  it('follows the joule with the chase target', () => {
    const state = stateAt(UNITS.onRoof, 'air');
    settle(state);
    expect(assembly.chaseTarget()).toEqual({
      position: state.joule.position,
      heading: state.joule.heading,
      pitch: 0,
      roll: 0,
      span: state.joule.span,
    });
  });

  it('stops animating once paused and idle', () => {
    settle(stateAt(UNITS.inHall, 'liquid', QUIET_VIEWS));
    expect(assembly.update(FRAME, CAMERA_DISTANCE)).toBe(false);
  });

  it('runs the outage drill only after the token changes, then rests', () => {
    const quiet = (token: number) => stateAt(UNITS.inHall, 'liquid', QUIET_VIEWS, token);
    settle(quiet(0));
    expect(assembly.update(FRAME, CAMERA_DISTANCE)).toBe(false);
    assembly.setState(quiet(1));
    expect(assembly.update(FRAME, CAMERA_DISTANCE)).toBe(true);
    expect(assembly.update(OUTAGE_DRILL.seconds / 2, CAMERA_DISTANCE)).toBe(true);
    assembly.setState(quiet(1));
    assembly.update(OUTAGE_DRILL.seconds, CAMERA_DISTANCE);
    assembly.update(FRAME, CAMERA_DISTANCE);
    expect(assembly.update(FRAME, CAMERA_DISTANCE)).toBe(false);
  });

  it('warms up only hidden drawables, one per material', () => {
    settle(stateAt(UNITS.inHall, 'liquid', { inset: false, lineUp: false }));
    const compile = vi.fn<(object: Object3D) => void>();
    assembly.warmUp?.(compile);
    const compiled = compile.mock.calls.map(([object]) => object);
    expect(compiled.length).toBeGreaterThan(0);
    expect(compiled.every((object) => !isShown(object))).toBe(true);
    const materialsSeen = compiled.map((object) => (object as Mesh).material);
    expect(new Set(materialsSeen).size).toBe(materialsSeen.length);
  });

  it('frees its geometries, instance buffers and registered materials on dispose', () => {
    const library = new MaterialLibrary();
    const register = vi.spyOn(library, 'register');
    const extra = createDataCenterAssembly({ materials: library, textures }, stateAt(0));
    const geometries = new Set<BufferGeometry>();
    const instanced: InstancedMesh[] = [];
    extra.root.traverse((object) => {
      if (object instanceof Mesh) geometries.add(object.geometry);
      if (object instanceof InstancedMesh) instanced.push(object);
    });
    const registered = register.mock.calls.map(([, material]) => material);
    const freed = [...geometries, ...registered, ...instanced].map(onDispose);
    expect(() => extra.dispose()).not.toThrow();
    expect(extra.root.parent).toBeNull();
    expect(freed.every(({ done }) => done)).toBe(true);
    library.dispose();
  });
});
