import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh, Points, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import type { SceneTextures } from '@core/scene/textures';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { AV_VALVES_OPEN_MS, EJECTION, SEMILUNAR_OPEN_MS } from '../model';
import { HeartAssembly } from './heartAssembly';

const STATE: AssemblyState = {
  time: 100,
  chamber: 'leftVentricle',
  valve: 'mitral',
  view: { cutaway: false, flow: true, conduction: false, labels: false },
};
const ANCHORS: readonly AnchorId[] = [
  'apex',
  'tricuspid',
  'pulmonary',
  'mitral',
  'aortic',
  'sinusNode',
  'avNode',
  'rightAtrium',
  'rightVentricle',
  'leftAtrium',
  'leftVentricle',
];
const REGIONS: readonly RegionId[] = [
  'scene',
  'heart',
  'chambers',
  'leftHeart',
  'rightHeart',
  'conduction',
  'valves',
  'atria',
  'ventricles',
];
const TRIANGLE_BUDGET = 150_000;
const FRAME_STEP_MS = 16;

let assembly: HeartAssembly;
let materials: MaterialLibrary;
let textures: SceneTextures;

function meshesOf(group: string): Mesh[] {
  const found: Mesh[] = [];
  assembly.root.traverse((object) => {
    if (
      object instanceof Mesh &&
      !Array.isArray(object.material) &&
      materials.groupOf(object.material) === group
    ) {
      found.push(object);
    }
  });
  return found;
}

function positionsOf(mesh: Mesh): number[] {
  return [...mesh.geometry.getAttribute('position').array];
}

function worldPosition(object: Object3D): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function triangles(geometry: BufferGeometry): number {
  return (geometry.getIndex()?.count ?? geometry.getAttribute('position').count) / 3;
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = new HeartAssembly({ materials, textures }, STATE);
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
});

describe('heart assembly', () => {
  it('gives every part a label anchor', () => {
    const labels = assembly.labelAnchors();
    expect(labels.size).toBe(PART_IDS.length);
    for (const id of PART_IDS) expect(labels.get(id as PartId)).toBeDefined();
  });

  it('places every named anchor', () => {
    for (const id of ANCHORS)
      expect(worldPosition(assembly.anchor(id)).length()).toBeGreaterThan(0);
  });

  it('returns a world box for every region', () => {
    for (const id of REGIONS) {
      const box = assembly.region(id);
      expect(box.isEmpty()).toBe(false);
      expect(box.containsPoint(worldPosition(assembly.anchor('leftVentricle')))).toBe(
        !['rightHeart', 'atria', 'valves'].includes(id),
      );
    }
  });

  it('swings the mitral leaflets between open and shut', () => {
    const [ring, leaflets] = meshesOf('mitralValve');
    expect(ring).toBeDefined();
    assembly.setState({ ...STATE, time: AV_VALVES_OPEN_MS + 60 });
    const open = positionsOf(leaflets);
    assembly.setState({ ...STATE, time: (EJECTION.start + EJECTION.end) / 2 });
    const shut = positionsOf(leaflets);
    const lowest = (values: number[]) => Math.min(...values.filter((_, index) => index % 3 === 1));
    expect(lowest(open)).toBeLessThan(lowest(shut) - 5);
  });

  it('squeezes the ventricles during ejection', () => {
    const [wall] = meshesOf('wall');
    assembly.setState({ ...STATE, time: SEMILUNAR_OPEN_MS - 10 });
    const before = wall.morphTargetInfluences?.[0] ?? 0;
    assembly.setState({ ...STATE, time: EJECTION.end - 5 });
    const after = wall.morphTargetInfluences?.[0] ?? 0;
    expect(before).toBeLessThan(0.05);
    expect(after).toBeGreaterThan(0.9);
  });

  it('opens the heart on the frontal plane', () => {
    assembly.setState({ ...STATE, view: { ...STATE.view, cutaway: false } });
    const cavity = meshesOf('leftVentricle')[0];
    expect(isShown(cavity)).toBe(false);
    assembly.setState({ ...STATE, view: { ...STATE.view, cutaway: true } });
    expect(isShown(cavity)).toBe(true);
    const shownWalls = meshesOf('wall').filter(isShown);
    for (const mesh of shownWalls) {
      const positions = mesh.geometry.getAttribute('position').array;
      for (let offset = 2; offset < positions.length; offset += 3)
        expect(positions[offset]).toBeLessThan(0.5);
    }
  });

  it('moves the blood with the beat only while the flow is shown', () => {
    const clouds: Points[] = [];
    assembly.root.traverse((object) => {
      if (object instanceof Points) clouds.push(object);
    });
    expect(clouds).toHaveLength(2);
    assembly.setState({ ...STATE, time: SEMILUNAR_OPEN_MS + 20 });
    const before = [...clouds[1].geometry.getAttribute('position').array];
    for (let step = 1; step <= 5; step += 1) {
      assembly.setState({ ...STATE, time: SEMILUNAR_OPEN_MS + 20 + step * FRAME_STEP_MS });
    }
    const after = [...clouds[1].geometry.getAttribute('position').array];
    expect(after).not.toEqual(before);
    assembly.setState({ ...STATE, view: { ...STATE.view, flow: false } });
    expect(clouds.every((cloud) => !isShown(cloud))).toBe(true);
  });

  it('lights the conduction system only when asked', () => {
    const [node] = meshesOf('sinusNode');
    assembly.setState({ ...STATE, view: { ...STATE.view, conduction: false } });
    expect(isShown(node)).toBe(false);
    assembly.setState({ ...STATE, time: 5, view: { ...STATE.view, conduction: true } });
    expect(isShown(node)).toBe(true);
  });

  it('draws nothing on its own and stays within the triangle budget', () => {
    expect(assembly.update(1 / 60, 400)).toBe(false);
    let total = 0;
    assembly.root.traverse((object) => {
      if (object instanceof InstancedMesh) total += triangles(object.geometry) * object.count;
      else if (object instanceof Mesh) total += triangles(object.geometry);
    });
    expect(total).toBeLessThan(TRIANGLE_BUDGET);
  });
});
