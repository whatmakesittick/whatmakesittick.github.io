import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { InstancedMesh, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, CoolingId, PartId, ViewOptions } from '../ids';
import { ANCHOR_POINTS, MOMENTS, REGION_SPECS, jouleAt } from '../model';
import type { FixedAnchorId } from '../model';
import { PlaceholderAssembly, createPlaceholderAssembly } from './placeholderAssembly';

const POSITION_DIGITS = 6;
const FRAME = 1 / 60;
const CAMERA_DISTANCE = 20;
const UNITS = { start: 0, inHall: 400, atChip: MOMENTS.becomesHeat, onRoof: 900 } as const;
const ALL_VIEWS: ViewOptions = {
  power: true,
  heat: true,
  packets: false,
  labels: true,
  cutaway: false,
  follow: false,
  inset: true,
  lineUp: true,
};

function stateAt(
  units: number,
  cooling: CoolingId = 'liquid',
  view: Partial<ViewOptions> = {},
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
    outage: { token: 0 },
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
  assembly = new PlaceholderAssembly({ materials, textures }, stateAt(UNITS.start));
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
    REGION_IDS.forEach((id) => {
      const box = assembly.region(id);
      expect(box.isEmpty()).toBe(false);
      expect(box.min.x).toBe(REGION_SPECS[id].x[0]);
      expect(box.max.y).toBe(REGION_SPECS[id].y[1]);
    });
  });

  it('puts the fixed anchors on their layout points', () => {
    (Object.keys(ANCHOR_POINTS) as FixedAnchorId[]).forEach((id) => {
      const spot = worldOf(assembly.anchor(id)).toArray();
      spot.forEach((value, axis) =>
        expect(value).toBeCloseTo(ANCHOR_POINTS[id][axis], POSITION_DIGITS),
      );
    });
  });

  it('moves the joule bead and its anchor to the joule on every state', () => {
    [UNITS.start, UNITS.inHall, UNITS.atChip, UNITS.onRoof].forEach((units) => {
      const state = stateAt(units);
      assembly.setState(state);
      [assembly.anchor('joule'), label('joule')].forEach((object) =>
        worldOf(object)
          .toArray()
          .forEach((value, axis) =>
            expect(value).toBeCloseTo(state.joule.position[axis], POSITION_DIGITS),
          ),
      );
    });
    const before = worldOf(assembly.anchor('joule')).clone();
    assembly.setState(stateAt(UNITS.inHall));
    expect(worldOf(assembly.anchor('joule')).distanceTo(before)).toBeGreaterThan(0);
  });

  it('turns the bead from current to heat at the chip', () => {
    const bead = (units: number) => {
      assembly.setState(stateAt(units));
      const mesh = assembly.anchor('joule').children[0];
      if (!(mesh instanceof Mesh)) throw new Error('No joule bead');
      return mesh.material;
    };
    expect(bead(UNITS.inHall)).not.toBe(bead(UNITS.atChip));
    expect(bead(UNITS.onRoof)).toBe(bead(UNITS.atChip));
  });

  it('shows the air handlers only with air cooling and the CDUs only with liquid', () => {
    assembly.setState(stateAt(UNITS.inHall, 'liquid'));
    expect(isShown(label('airHandlers'))).toBe(false);
    expect(isShown(label('cdu'))).toBe(true);
    expect(isShown(label('manifold'))).toBe(true);
    assembly.setState(stateAt(UNITS.inHall, 'air'));
    expect(isShown(label('airHandlers'))).toBe(true);
    expect(isShown(label('cdu'))).toBe(false);
    expect(isShown(label('manifold'))).toBe(false);
  });

  it('shows the chip inset and the line-up only with their view flags', () => {
    const drawings: readonly [keyof ViewOptions, PartId][] = [
      ['inset', 'chipInset'],
      ['lineUp', 'laptop'],
    ];
    drawings.forEach(([flag, id]) => {
      assembly.setState(stateAt(UNITS.inHall));
      expect(isShown(label(id))).toBe(true);
      assembly.setState(stateAt(UNITS.inHall, 'liquid', { [flag]: false }));
      expect(isShown(label(id))).toBe(false);
    });
  });

  it('follows the joule with the chase target', () => {
    const state = stateAt(UNITS.onRoof, 'air');
    assembly.setState(state);
    expect(assembly.chaseTarget()).toEqual({
      position: state.joule.position,
      heading: state.joule.heading,
      pitch: 0,
      roll: 0,
      span: state.joule.span,
    });
  });

  it('never asks for another frame', () => {
    assembly.setState({ ...stateAt(UNITS.inHall), playing: true });
    expect(assembly.update(FRAME, CAMERA_DISTANCE)).toBe(false);
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
