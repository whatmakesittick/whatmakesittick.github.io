import type { BufferGeometry, Material, Texture } from 'three';

type Disposable = BufferGeometry | Material | Texture;

export class ResourceTracker {
  private readonly resources = new Set<Disposable>();

  track<T extends Disposable>(resource: T): T {
    this.resources.add(resource);
    return resource;
  }

  dispose(): void {
    this.resources.forEach((resource) => resource.dispose());
    this.resources.clear();
  }
}
