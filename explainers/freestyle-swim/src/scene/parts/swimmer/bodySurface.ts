import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Mesh,
  Sphere,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import type { BodySkin } from './skin/bodySkin';
import { SLOT_IDS } from './skin/types';
import type { SlotId } from './skin/types';

const ITEM_SIZE = 3;

interface SlotBounds {
  readonly vertices: Uint16Array;
  readonly box: Box3;
  readonly sphere: Sphere;
}

const corner = new Vector3();

function uniqueVertices(indices: Uint16Array, vertexCount: number): Uint16Array {
  const seen = new Uint8Array(vertexCount);
  const vertices: number[] = [];
  indices.forEach((index) => {
    if (seen[index]) return;
    seen[index] = 1;
    vertices.push(index);
  });
  return Uint16Array.from(vertices);
}

function fitBounds(bounds: SlotBounds, positions: Float32Array): void {
  bounds.box.makeEmpty();
  bounds.vertices.forEach((vertex) => {
    bounds.box.expandByPoint(corner.fromArray(positions, vertex * ITEM_SIZE));
  });
  bounds.box.getBoundingSphere(bounds.sphere);
}

export class DeformingMesh extends Mesh {
  // Core builds a static bounds tree for meshes typed 'Mesh'; this one changes shape every pose.
  override readonly type: string = 'DeformingMesh';
}

export interface SurfaceParts {
  readonly slots: Readonly<Record<SlotId, Uint16Array>>;
  readonly materialOf: (slot: SlotId) => Material;
  readonly track: <T extends { dispose(): void }>(item: T) => T;
  readonly parent: Object3D;
}

export class BodySurface {
  readonly meshes: ReadonlyMap<SlotId, Mesh>;
  private readonly position: BufferAttribute;
  private readonly normal: BufferAttribute;
  private readonly bounds: SlotBounds[] = [];

  constructor(skin: BodySkin, parts: SurfaceParts) {
    this.position = new BufferAttribute(skin.positions, ITEM_SIZE).setUsage(DynamicDrawUsage);
    this.normal = new BufferAttribute(skin.normals, ITEM_SIZE).setUsage(DynamicDrawUsage);
    const meshes = new Map<SlotId, Mesh>();
    const vertexCount = skin.positions.length / ITEM_SIZE;
    SLOT_IDS.forEach((slot) => {
      const indices = parts.slots[slot];
      const bounds = {
        vertices: uniqueVertices(indices, vertexCount),
        box: new Box3(),
        sphere: new Sphere(),
      };
      this.bounds.push(bounds);
      const geometry = parts.track(this.geometry(indices, bounds));
      const mesh = new DeformingMesh(geometry, parts.materialOf(slot));
      mesh.name = slot;
      parts.parent.add(mesh);
      meshes.set(slot, mesh);
    });
    this.meshes = meshes;
  }

  update(skin: BodySkin): void {
    this.position.needsUpdate = true;
    this.normal.needsUpdate = true;
    this.bounds.forEach((bounds) => fitBounds(bounds, skin.positions));
  }

  private geometry(indices: Uint16Array, bounds: SlotBounds): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setIndex(new BufferAttribute(indices, 1));
    geometry.setAttribute('position', this.position);
    geometry.setAttribute('normal', this.normal);
    geometry.boundingSphere = bounds.sphere;
    geometry.boundingBox = bounds.box;
    return geometry;
  }
}
