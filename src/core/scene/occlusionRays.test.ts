import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  SphereGeometry,
  Vector3,
} from 'three';
import { describe, expect, it, vi } from 'vitest';
import { OcclusionRays, TREE_BUILDS_PER_PASS, TREE_MIN_TRIANGLES } from './occlusionRays';

const PART = 'wheel';
const CAMERA_Z = 10;
const ORIGIN = new Vector3();
const DENSE_SEGMENTS = 64;
const SPHERE_Z = 5;
const SPREAD = 4;

function denseSphere(): Mesh {
  const mesh = new Mesh(
    new SphereGeometry(1, DENSE_SEGMENTS, DENSE_SEGMENTS / 2),
    new MeshBasicMaterial(),
  );
  mesh.position.z = SPHERE_Z;
  return mesh;
}

function prepared(scene: Group): OcclusionRays {
  const camera = new PerspectiveCamera();
  camera.position.z = CAMERA_Z;
  const rays = new OcclusionRays({ scene, partOf: () => undefined });
  rays.prepare(camera, true);
  return rays;
}

describe('OcclusionRays', () => {
  it('finds a dense mesh through its bounds tree without touching the geometry', () => {
    const scene = new Group();
    const sphere = denseSphere();
    const index = sphere.geometry.index?.array.slice();
    scene.add(sphere);
    const raycast = vi.spyOn(sphere, 'raycast');
    const rays = prepared(scene);
    expect(sphere.geometry.index?.count ?? 0).toBeGreaterThan(TREE_MIN_TRIANGLES * 3);
    expect(rays.isBlocked(ORIGIN, CAMERA_Z, PART)).toBe(true);
    expect(raycast).not.toHaveBeenCalled();
    expect(sphere.geometry.index?.array).toEqual(index);
  });

  it('ignores a blocker beyond the reach', () => {
    const scene = new Group();
    scene.add(denseSphere());
    const rays = prepared(scene);
    expect(rays.isBlocked(ORIGIN, CAMERA_Z - SPHERE_Z - 2, PART)).toBe(false);
  });

  it('follows the world transform of a scaled mesh', () => {
    const scene = new Group();
    const sphere = denseSphere();
    sphere.scale.set(0.1, 0.1, 4);
    sphere.position.x = 0.5;
    scene.add(sphere);
    const rays = prepared(scene);
    expect(rays.isBlocked(ORIGIN, CAMERA_Z, PART)).toBe(false);
    sphere.scale.set(1, 1, 4);
    rays.prepare(new PerspectiveCamera().translateZ(CAMERA_Z), true);
    expect(rays.isBlocked(ORIGIN, CAMERA_Z, PART)).toBe(true);
  });

  it('builds a limited number of trees per pass and casts plainly meanwhile', () => {
    const scene = new Group();
    const spheres = Array.from({ length: TREE_BUILDS_PER_PASS + 1 }, (_, index) => {
      const sphere = denseSphere();
      sphere.position.x = index * SPREAD;
      return sphere;
    });
    scene.add(...spheres);
    const plainCasts = () =>
      spheres.filter((sphere) => vi.mocked(sphere.raycast).mock.calls.length);
    spheres.forEach((sphere) => vi.spyOn(sphere, 'raycast'));
    const rays = prepared(scene);
    const behind = (sphere: Mesh) =>
      new Vector3((sphere.position.x * CAMERA_Z) / (CAMERA_Z - SPHERE_Z), 0, 0);
    const castAtEach = () =>
      spheres.forEach((sphere) => rays.isBlocked(behind(sphere), CAMERA_Z, PART));
    castAtEach();
    expect(plainCasts()).toHaveLength(1);
    spheres.forEach((sphere) => vi.mocked(sphere.raycast).mockClear());
    rays.prepare(new PerspectiveCamera().translateZ(CAMERA_Z), true);
    castAtEach();
    expect(plainCasts()).toHaveLength(0);
  });

  it('skips invisible objects', () => {
    const scene = new Group();
    const box = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    box.position.z = SPHERE_Z;
    box.visible = false;
    scene.add(box);
    expect(prepared(scene).isBlocked(ORIGIN, CAMERA_Z, PART)).toBe(false);
  });
});
