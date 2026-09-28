import { afterEach, describe, expect, it, vi } from 'vitest';
import { InstancedMesh, Mesh, Vector3 } from 'three';
import type { Object3D, BufferGeometry } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import type { SceneTextures } from '@core/scene/textures';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, RegionId } from '../ids';
import { DAY_START_MIN, SOLAR_NOON_MIN, SUNRISE_MIN } from '../model';
import { HERO_PANEL_PARTS } from './constants';
import { SolarAssembly } from './solarAssembly';

const STATE: AssemblyState = {
  minute: SOLAR_NOON_MIN,
  tilt: 35,
  explode: 0,
  wavelength: 600,
  shade: 0,
  layout: 'halfCut',
  irradiance: 973,
  power: 375,
  cellTemperature: 54,
  deadStrings: [false, false, false, false, false, false],
  activeDiodes: [false, false, false],
  view: { sun: true, slice: false, flow: true, labels: false },
};

const REGIONS: readonly RegionId[] = [
  'scene',
  'house',
  'array',
  'panel',
  'stack',
  'slice',
  'inverter',
];
const ANCHORS: readonly AnchorId[] = ['panel', 'sun', 'slice', 'inverter', 'junctionBox'];
const FRAME = 1 / 60;
const CAMERA_DISTANCE = 900;
const TRIANGLE_BUDGET = 200_000;
const DRAW_CALL_BUDGET = 160;

let assembly: SolarAssembly | null = null;
let textures: SceneTextures | null = null;
let materials: MaterialLibrary | null = null;

function build(state: AssemblyState = STATE): SolarAssembly {
  textures = createSceneTextures();
  materials = new MaterialLibrary();
  assembly = new SolarAssembly({ materials, textures }, state);
  return assembly;
}

function worldPosition(object: Object3D): Vector3 {
  return object.getWorldPosition(new Vector3());
}

function shown(solar: SolarAssembly, id: (typeof PART_IDS)[number]): boolean {
  const anchor = solar.labelAnchors().get(id);
  return anchor ? isShown(anchor) : false;
}

function budget(root: Object3D): { triangles: number; drawCalls: number } {
  let triangles = 0;
  let drawCalls = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry;
    const position = geometry.getAttribute('position');
    if (!position) return;
    const count = geometry.index ? geometry.index.count / 3 : position.count / 3;
    const instances = object instanceof InstancedMesh ? object.count : 1;
    triangles += count * instances;
    drawCalls += Array.isArray(object.material) ? object.material.length : 1;
  });
  return { triangles, drawCalls };
}

afterEach(() => {
  assembly?.dispose();
  textures?.dispose();
  materials?.dispose();
  assembly = null;
  textures = null;
  materials = null;
});

describe('SolarAssembly', () => {
  it('anchors every part and names every camera anchor', () => {
    const solar = build();
    const anchors = solar.labelAnchors();
    PART_IDS.forEach((id) => expect(anchors.get(id), id).toBeDefined());
    ANCHORS.forEach((id) => expect(solar.anchor(id), id).toBeDefined());
  });

  it('gives every region a finite, non-empty box', () => {
    const solar = build();
    REGIONS.forEach((id) => {
      const box = solar.region(id);
      expect(box.isEmpty(), id).toBe(false);
      expect(
        Number.isFinite(box.min.x + box.max.x + box.min.y + box.max.y + box.min.z + box.max.z),
        id,
      ).toBe(true);
    });
    expect(solar.region('scene').containsBox(solar.region('array'))).toBe(true);
    expect(solar.region('house').containsBox(solar.region('inverter'))).toBe(true);
  });

  it('leans the panel with the tilt and grows the stack with the explode', () => {
    const solar = build();
    const low = solar.region('panel').max.y;
    const flat = solar.region('stack').getSize(new Vector3());
    solar.setState({ ...STATE, tilt: 70, explode: 1 });
    expect(solar.region('panel').max.y).toBeGreaterThan(low + 40);
    const open = solar.region('stack').getSize(new Vector3());
    expect(open.length()).toBeGreaterThan(flat.length() + 20);
  });

  it('moves the sun from east to west along the day', () => {
    const solar = build({ ...STATE, minute: SUNRISE_MIN + 60 });
    const morning = worldPosition(solar.anchor('sun'));
    solar.setState({ ...STATE, minute: SOLAR_NOON_MIN + 300 });
    const afternoon = worldPosition(solar.anchor('sun'));
    expect(morning.x).toBeGreaterThan(0);
    expect(afternoon.x).toBeLessThan(0);
    solar.setState({ ...STATE, minute: DAY_START_MIN });
    expect(isShown(solar.anchor('sun'))).toBe(false);
  });

  it('shows the slice and its parts only with the slice view', () => {
    const solar = build();
    expect(shown(solar, 'junction')).toBe(false);
    solar.setState({ ...STATE, view: { ...STATE.view, slice: true } });
    expect(shown(solar, 'junction')).toBe(true);
    expect(shown(solar, 'finger')).toBe(true);
  });

  it('keeps its own copy of the state it is given', () => {
    const solar = build();
    const reused = { ...STATE, view: { ...STATE.view }, deadStrings: [...STATE.deadStrings] };
    solar.setState(reused);
    reused.view.slice = true;
    reused.deadStrings[0] = true;
    expect(() => solar.setState(reused)).not.toThrow();
    expect(shown(solar, 'junction')).toBe(true);
  });

  it('runs every layout, shade, flag and view through frames', () => {
    const solar = build();
    const states: AssemblyState[] = [
      { ...STATE, view: { sun: false, slice: true, flow: true, labels: true }, wavelength: 450 },
      { ...STATE, view: { sun: true, slice: true, flow: false, labels: false }, wavelength: 1200 },
      {
        ...STATE,
        layout: 'fullCell',
        deadStrings: [true, false, false],
        activeDiodes: [true, false, false],
      },
      {
        ...STATE,
        shade: 0.6,
        deadStrings: [true, true, false, false, false, false],
        activeDiodes: [true, false, false],
      },
      { ...STATE, minute: DAY_START_MIN, irradiance: 0, power: 0, cellTemperature: 11, tilt: 0 },
      { ...STATE, tilt: 90, explode: 0.6, cellTemperature: 75 },
    ];
    states.forEach((state) => {
      solar.setState(state);
      for (let frame = 0; frame < 30; frame += 1) {
        expect(() => solar.update(FRAME, CAMERA_DISTANCE)).not.toThrow();
      }
    });
  });

  it('stays within the triangle and draw call budget', () => {
    const solar = build({ ...STATE, view: { ...STATE.view, slice: true } });
    const { triangles, drawCalls } = budget(solar.root);
    console.log(`triangles ${triangles}, draw calls ${drawCalls}`);
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET);
    expect(drawCalls).toBeLessThan(DRAW_CALL_BUDGET);
  });

  it('draws the hero panel only with the groups a panel highlight expands to', () => {
    const solar = build();
    const library = materials;
    if (!library) throw new Error('No material library');
    const heroGroups = new Set<string>();
    const hero = solar.anchor('panel').parent;
    if (!hero) throw new Error('No hero panel');
    hero.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach((material) => {
        const group = library.groupOf(material);
        if (group) heroGroups.add(group);
      });
    });
    const allowed = new Set<string>([...HERO_PANEL_PARTS, 'connector']);
    heroGroups.forEach((group) => expect(allowed.has(group), group).toBe(true));
  });

  it('disposes its geometries and leaves no material registered', () => {
    const solar = build({ ...STATE, view: { ...STATE.view, slice: true } });
    const geometries = new Set<BufferGeometry>();
    solar.root.traverse((object) => {
      if (object instanceof Mesh) geometries.add(object.geometry);
    });
    const disposed = new Set<BufferGeometry>();
    geometries.forEach((geometry) =>
      geometry.addEventListener('dispose', () => disposed.add(geometry)),
    );
    const library = materials;
    if (!library) throw new Error('No material library');
    const clear = vi.spyOn(library, 'clearRegistered');
    solar.dispose();
    assembly = null;
    expect(clear).toHaveBeenCalled();
    expect(disposed.size).toBe(geometries.size);
    expect(solar.root.parent).toBeNull();
  });
});
