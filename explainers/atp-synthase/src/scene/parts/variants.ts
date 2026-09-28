import type { Object3D } from 'three';

export class Variants<K> {
  private readonly parent: Object3D;
  private readonly build: (key: K) => Object3D;
  private readonly built = new Map<K, Object3D>();
  private shown: Object3D | null = null;

  constructor(parent: Object3D, build: (key: K) => Object3D) {
    this.parent = parent;
    this.build = build;
  }

  show(key: K): void {
    const variant = this.built.get(key) ?? this.add(key);
    if (variant === this.shown) return;
    if (this.shown) this.shown.visible = false;
    variant.visible = true;
    this.shown = variant;
  }

  private add(key: K): Object3D {
    const variant = this.build(key);
    this.built.set(key, variant);
    this.parent.add(variant);
    return variant;
  }
}
