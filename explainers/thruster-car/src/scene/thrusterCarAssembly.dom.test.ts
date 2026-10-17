import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Mesh, Points, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, NozzlePartId } from '../ids';
import { CAR, MOMENTS, SITE_ANCHORS, runAt, tankAt } from '../model';
import { PLUME_GROUPS, plumeName } from './parts/effects/plumes';
import { ThrusterCarAssembly, createThrusterCarAssembly } from './thrusterCarAssembly';

const FRAME = 1 / 60;
const BOOST_SECONDS = 1;
const COAST_SECONDS = 3.5;
const CATCH_SECONDS = 6;
const REST_SECONDS = 8;
const CAMERA_DISTANCE = 10;
const VIEW = { nozzles: false, forces: false, tank: false, ghost: false, labels: true };

function stateAt(seconds: number, empty = false): AssemblyState {
  const { car, nozzles, fans } = runAt(seconds);
  return {
    phase: seconds,
    playing: false,
    gas: 'air',
    tankLitres: 600,
    car,
    nozzles,
    tank: { ...tankAt(seconds, 'air', 600), empty },
    fans,
    view: VIEW,
  };
}

let materials: MaterialLibrary;
let textures: ReturnType<typeof createSceneTextures>;
let assembly: ThrusterCarAssembly;

function firing(): NozzlePartId[] {
  return PLUME_GROUPS.filter((group) => {
    const cloud = assembly.root.getObjectByName(plumeName(group));
    if (!cloud) throw new Error(`No plume for ${group}`);
    return isShown(cloud);
  });
}

function worldOf(object: Object3D): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function onDispose(resource: { addEventListener(type: 'dispose', listener: () => void): void }) {
  const freed = { done: false };
  resource.addEventListener('dispose', () => (freed.done = true));
  return freed;
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = new ThrusterCarAssembly({ materials, textures }, stateAt(0));
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
});

describe('thruster car assembly', () => {
  it('anchors a label for every part, the car and the site', () => {
    expect([...assembly.labelAnchors().keys()].sort()).toEqual([...PART_IDS].sort());
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    expect(worldOf(assembly.anchor('rampExit')).toArray()).toEqual([...SITE_ANCHORS.rampExit]);
  });

  it('moves the car regions and the chase target with the car', () => {
    const peak = runAt(MOMENTS.peak).car;
    assembly.setState(stateAt(MOMENTS.peak));
    const centre = worldOf(assembly.anchor('car'));
    expect(centre.x).toBeCloseTo(peak.position[0], 0);
    expect(assembly.region('car').containsPoint(centre)).toBe(true);
    expect(assembly.region('cabin').containsPoint(worldOf(assembly.anchor('tank')))).toBe(true);
    expect(assembly.chaseTarget()).toEqual({
      position: peak.position,
      heading: 0,
      pitch: peak.pitch,
      roll: peak.roll,
      span: CAR.wheelbase,
    });
  });

  it('fires the nozzles the run asks for and none once the tank is empty', () => {
    assembly.setState(stateAt(BOOST_SECONDS));
    expect(firing()).toEqual(['rearNozzles']);
    assembly.setState(stateAt(COAST_SECONDS));
    expect(firing()).toEqual([]);
    assembly.setState(stateAt(CATCH_SECONDS));
    expect(firing()).toEqual(['cornerNozzles']);
    assembly.setState(stateAt(CATCH_SECONDS, true));
    expect(firing()).toEqual([]);
  });

  it('animates while a plume puffs, even when paused, and rests when nothing moves', () => {
    assembly.setState(stateAt(BOOST_SECONDS));
    expect(assembly.update(FRAME, CAMERA_DISTANCE)).toBe(true);
    assembly.setState(stateAt(REST_SECONDS));
    expect(assembly.update(FRAME, CAMERA_DISTANCE)).toBe(false);
  });

  it('compiles every hidden material once when warming up', () => {
    assembly.setState(stateAt(REST_SECONDS));
    const compiled: Object3D[] = [];
    assembly.warmUp((object) => compiled.push(object));
    const seen = new Set(compiled.map((object) => (object as Mesh).material));
    expect(compiled.length).toBeGreaterThan(0);
    expect(seen.size).toBe(compiled.length);
    expect(compiled.every((object) => !isShown(object))).toBe(true);
  });

  it('frees its geometries and the materials it registered on dispose', () => {
    const library = new MaterialLibrary();
    const register = vi.spyOn(library, 'register');
    const extra = createThrusterCarAssembly({ materials: library, textures }, stateAt(0));
    const geometries = new Set<BufferGeometry>();
    extra.root.traverse((object) => {
      if (object instanceof Mesh || object instanceof Points) geometries.add(object.geometry);
    });
    const registeredMaterials = register.mock.calls.map(([, material]) => material);
    const freed = [...geometries, ...registeredMaterials].map(onDispose);
    extra.dispose();
    expect(extra.root.parent).toBeNull();
    expect(registeredMaterials.length).toBeGreaterThan(0);
    expect(freed.every(({ done }) => done)).toBe(true);
    library.dispose();
  });
});
