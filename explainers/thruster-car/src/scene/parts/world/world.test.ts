import { Color, InstancedMesh, Mesh, Vector3 } from 'three';
import type { Material, MeshStandardMaterial, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialLibrary, STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import { SITE, SITE_ANCHORS } from '../../../model/layout';
import { LIGHT_RIG } from '../../constants';
import { SCENE_OPTIONS } from '../../sceneOptions';
import type { PartContext } from '../context';
import { conePositions } from './runway';
import { glowDirection, skyUniforms } from './sky';
import { createWorld } from './world';

const TRIANGLE_BUDGET = 60000;
const DRAW_CALL_BUDGET = 40;

function buildWorld() {
  const tracker = new ResourceTracker();
  const tracked = new Set<unknown>();
  const track = tracker.track.bind(tracker);
  tracker.track = <T extends { dispose(): void }>(resource: T): T => {
    tracked.add(resource);
    return track(resource);
  };
  const context: PartContext = {
    materials: new MaterialLibrary(),
    textures: {} as unknown as SceneTextures,
    tracker,
  };
  return { context, tracked, world: createWorld(context) };
}

function meshes(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof Mesh) found.push(child);
  });
  return found;
}

function triangles(mesh: Mesh): number {
  const { geometry } = mesh;
  const corners = geometry.index?.count ?? geometry.getAttribute('position').count;
  const copies = mesh instanceof InstancedMesh ? mesh.count : 1;
  return (corners / 3) * copies;
}

function worldPosition(object: Object3D): Vector3 {
  object.updateWorldMatrix(true, false);
  return object.getWorldPosition(new Vector3());
}

describe('world', () => {
  const { context, tracked, world } = buildWorld();
  const all = meshes(world.object);
  const groupOf = (mesh: Mesh) => context.materials.groupOf(mesh.material as Material);

  it('labels the runway, the ramp and the landing pad', () => {
    expect([...world.labels.keys()].sort()).toEqual(['landingPad', 'ramp', 'runway']);
    const pad = worldPosition(world.labels.get('landingPad') as Object3D);
    expect(pad.toArray()).toEqual([...SITE_ANCHORS.pad]);
  });

  it('places the ramp exit and pad anchors', () => {
    expect(worldPosition(world.anchors.rampExit).toArray()).toEqual([...SITE_ANCHORS.rampExit]);
    expect(worldPosition(world.anchors.pad).toArray()).toEqual([...SITE_ANCHORS.pad]);
    expect(worldPosition(world.anchors.row).toArray()).toEqual([...SITE_ANCHORS.row]);
  });

  it('stays inside the triangle and draw call budget', () => {
    const total = all.reduce((sum, mesh) => sum + triangles(mesh), 0);
    expect(total).toBeLessThan(TRIANGLE_BUDGET);
    expect(all.length).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  });

  it('files every mesh under its part, the structure or the backdrop', () => {
    const groups = new Set(all.map(groupOf));
    expect(groups).toEqual(
      new Set(['runway', 'ramp', 'landingPad', STRUCTURE_GROUP, UNDIMMED_GROUP]),
    );
    expect(groupOf(world.object.getObjectByName('sky') as Mesh)).toBe(UNDIMMED_GROUP);
  });

  it('tracks every geometry, texture and own material for disposal', () => {
    all.forEach((mesh) => {
      expect(tracked.has(mesh.geometry)).toBe(true);
      const material = mesh.material as MeshStandardMaterial;
      if (material.map) expect(tracked.has(material.map)).toBe(true);
      if (material.normalMap) expect(tracked.has(material.normalMap)).toBe(true);
    });
    expect(tracked.has((world.object.getObjectByName('sky') as Mesh).material)).toBe(true);
  });

  it('lines the cones along the run every 5 m', () => {
    const cones = world.object.getObjectByName('cones') as InstancedMesh;
    expect(cones.count).toBe(conePositions().length);
    expect(conePositions()[0]).toBe(SITE.run.x[0]);
    expect(conePositions().at(-1)).toBe(SITE.run.x[1]);
  });
});

describe('dusk sky', () => {
  it('melts into the fog at the horizon and deepens to violet overhead', () => {
    const { uFog, uZenith, uHorizon } = skyUniforms();
    expect(uFog.value.equals(new Color(SCENE_OPTIONS.fog?.color))).toBe(true);
    const zenith = uZenith.value.getHSL({ h: 0, s: 0, l: 0 });
    const horizon = uHorizon.value.getHSL({ h: 0, s: 0, l: 0 });
    expect(zenith.l).toBeLessThan(horizon.l);
    expect(uZenith.value.b).toBeGreaterThan(uZenith.value.g);
    expect(uHorizon.value.r).toBeGreaterThan(uHorizon.value.b);
  });

  it('sets the sun glow just above the horizon toward the key light', () => {
    const glow = glowDirection();
    const [x, , z] = LIGHT_RIG.key.direction;
    expect(glow.length()).toBeCloseTo(1, 6);
    expect(glow.y).toBeGreaterThan(0);
    expect(glow.y).toBeLessThan(0.1);
    expect(Math.atan2(glow.z, glow.x)).toBeCloseTo(Math.atan2(z, x), 6);
  });
});
