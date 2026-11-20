import { Box3, BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh, Sphere } from 'three';
import type { Material, Object3D } from 'three';
import type { BodySkin } from './skin/bodySkin';
import { SLOT_IDS } from './skin/types';
import type { SlotId } from './skin/types';

const ITEM_SIZE = 3;

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
  private readonly sphere = new Sphere();
  private readonly box = new Box3();

  constructor(skin: BodySkin, parts: SurfaceParts) {
    this.position = new BufferAttribute(skin.positions, ITEM_SIZE).setUsage(DynamicDrawUsage);
    this.normal = new BufferAttribute(skin.normals, ITEM_SIZE).setUsage(DynamicDrawUsage);
    const meshes = new Map<SlotId, Mesh>();
    SLOT_IDS.forEach((slot) => {
      const geometry = parts.track(this.geometry(parts.slots[slot]));
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
    this.sphere.center.copy(skin.centre);
    this.sphere.radius = skin.radius;
    this.sphere.getBoundingBox(this.box);
  }

  private geometry(indices: Uint16Array): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setIndex(new BufferAttribute(indices, 1));
    geometry.setAttribute('position', this.position);
    geometry.setAttribute('normal', this.normal);
    geometry.boundingSphere = this.sphere;
    geometry.boundingBox = this.box;
    return geometry;
  }
}
