import { Color, Mesh, MeshBasicMaterial } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { MaterialFinish, MaterialLibrary } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';

export interface PartBuilderContext {
  readonly materials: MaterialLibrary;
  readonly tracker: ResourceTracker;
}

export class PartBuilder<Id extends string, Finish extends string> {
  readonly labels = new Map<Id, Object3D>();
  private readonly context: PartBuilderContext;
  private readonly finishes: Readonly<Record<Finish, MaterialFinish>>;

  constructor(context: PartBuilderContext, finishes: Readonly<Record<Finish, MaterialFinish>>) {
    this.context = context;
    this.finishes = finishes;
  }

  track<T extends { dispose(): void }>(item: T): T {
    return this.context.tracker.track(item);
  }

  material(group: string, finish: Finish): Material {
    return this.context.materials.get(group, this.finishes[finish]);
  }

  swatches(group: string, colors: readonly string[]): Color[] {
    return colors.map((color) => {
      const swatch = this.track(new MeshBasicMaterial({ color: new Color(color) }));
      this.context.materials.register(group, swatch);
      return swatch.color;
    });
  }

  mesh(geometry: BufferGeometry, group: string, finish: Finish, parent: Object3D): Mesh {
    const mesh = new Mesh(this.track(geometry), this.material(group, finish));
    parent.add(mesh);
    return mesh;
  }

  label(id: Id, parent: Object3D, at: readonly number[]): Object3D {
    const anchor = anchorAt(parent, at[0], at[1], at[2]);
    this.labels.set(id, anchor);
    return anchor;
  }
}
