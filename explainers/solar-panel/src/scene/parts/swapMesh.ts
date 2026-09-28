import { BufferGeometry, Mesh } from 'three';
import type { Material } from 'three';
import type { PartContext } from './context';

export class SwapMesh {
  readonly mesh: Mesh;

  constructor(context: PartContext, material: Material) {
    this.mesh = new Mesh(new BufferGeometry(), material);
    context.tracker.track(this);
  }

  swap(geometry: BufferGeometry): void {
    const previous = this.mesh.geometry;
    this.mesh.geometry = geometry;
    previous.dispose();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}
