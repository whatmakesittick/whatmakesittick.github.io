import { Raycaster, Sphere, Vector3 } from 'three';
import type { BufferGeometry, Intersection, Mesh, Object3D, PerspectiveCamera } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { isBlocking, isMesh, isSolid } from './occlusion';
import type { PartOf } from './occlusion';

export interface OcclusionRaysOptions {
  scene: Object3D;
  partOf: PartOf;
  ignored?: readonly Object3D[];
}

interface Blocker {
  mesh: Mesh;
  part: string | undefined;
  bounds: Sphere;
}

export const TREE_MIN_TRIANGLES = 64;
export const TREE_BUILDS_PER_PASS = 1;
const TREE_OPTIONS = { indirect: true } as const;
const PLAIN_MESH = 'Mesh';
const TRIANGLE_CORNERS = 3;

function triangleCount(geometry: BufferGeometry): number {
  const corners = geometry.index?.count ?? geometry.getAttribute('position').count;
  return corners / TRIANGLE_CORNERS;
}

function hasSolidMaterial(mesh: Mesh): boolean {
  return Array.isArray(mesh.material) ? mesh.material.some(isSolid) : isSolid(mesh.material);
}

function worldBounds(mesh: Mesh): Sphere {
  const { geometry } = mesh;
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const bounds = geometry.boundingSphere?.clone() ?? new Sphere();
  return bounds.applyMatrix4(mesh.matrixWorld);
}

function isBlocker(object: Object3D): object is Mesh {
  return isMesh(object) && object.frustumCulled && hasSolidMaterial(object);
}

export class OcclusionRays {
  private readonly scene: Object3D;
  private readonly partOf: PartOf;
  private readonly ignored: ReadonlySet<Object3D>;
  private readonly trees = new WeakMap<BufferGeometry, MeshBVH>();
  private readonly blockers: Blocker[] = [];
  private readonly raycaster = new Raycaster();
  private readonly hits: Intersection[] = [];
  private readonly origin = new Vector3();
  private readonly direction = new Vector3();
  private builds = 0;

  constructor(options: OcclusionRaysOptions) {
    this.scene = options.scene;
    this.partOf = options.partOf;
    this.ignored = new Set(options.ignored);
    this.raycaster.firstHitOnly = true;
  }

  prepare(camera: PerspectiveCamera, sceneChanged: boolean): void {
    if (sceneChanged) this.scene.updateMatrixWorld();
    this.builds = 0;
    this.blockers.length = 0;
    this.collect(this.scene);
    camera.getWorldPosition(this.origin);
    this.raycaster.near = camera.near;
  }

  distanceTo(target: Vector3): number {
    return this.origin.distanceTo(target);
  }

  isBlocked(target: Vector3, reach: number, part: string): boolean {
    if (reach <= this.raycaster.near) return false;
    this.direction.subVectors(target, this.origin).normalize();
    this.raycaster.set(this.origin, this.direction);
    this.raycaster.far = reach;
    return this.blockers.some(
      (blocker) => blocker.part !== part && this.reaches(blocker) && this.blocks(blocker, part),
    );
  }

  private collect(object: Object3D): void {
    if (!object.visible || this.ignored.has(object)) return;
    if (isBlocker(object)) this.blockers.push(this.blockerOf(object));
    for (const child of object.children) this.collect(child);
  }

  private blockerOf(mesh: Mesh): Blocker {
    const part = Array.isArray(mesh.material) ? undefined : this.partOf(mesh.material);
    return { mesh, part, bounds: worldBounds(mesh) };
  }

  private treeOf(mesh: Mesh): MeshBVH | undefined {
    const { geometry } = mesh;
    const tree = this.trees.get(geometry);
    if (tree || !this.canBuildTree(mesh)) return tree;
    this.builds += 1;
    const built = new MeshBVH(geometry, TREE_OPTIONS);
    this.trees.set(geometry, built);
    return built;
  }

  private canBuildTree(mesh: Mesh): boolean {
    return (
      mesh.type === PLAIN_MESH &&
      this.builds < TREE_BUILDS_PER_PASS &&
      triangleCount(mesh.geometry) >= TREE_MIN_TRIANGLES
    );
  }

  private reaches({ bounds }: Blocker): boolean {
    const { ray, far } = this.raycaster;
    return (
      ray.distanceSqToPoint(bounds.center) <= bounds.radius * bounds.radius &&
      ray.origin.distanceTo(bounds.center) - bounds.radius <= far
    );
  }

  private blocks({ mesh }: Blocker, part: string): boolean {
    this.hits.length = 0;
    this.cast(mesh);
    return this.hits.some((hit) => isBlocking(hit, part, this.partOf));
  }

  private cast(mesh: Mesh): void {
    const tree = this.treeOf(mesh);
    if (tree) {
      tree.raycastObject3D(mesh, this.raycaster, this.hits);
      return;
    }
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    mesh.raycast(this.raycaster, this.hits);
  }
}
