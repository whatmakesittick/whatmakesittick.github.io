import { MeshStandardMaterial } from 'three';
import type { MeshStandardMaterialParameters } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import type { ResourceTracker } from '@core/scene/resources';

const FULL_OPACITY = 0.999;
const SEE_THROUGH = 0.5;

export class TranslucentMaterial {
  readonly material: MeshStandardMaterial;
  readonly group: string;
  opacity: number;

  constructor(group: string, parameters: MeshStandardMaterialParameters, opacity: number) {
    this.group = group;
    this.opacity = opacity;
    this.material = new MeshStandardMaterial(parameters);
  }

  apply(emphasis: number): void {
    const fade = this.opacity < SEE_THROUGH ? emphasis * emphasis : emphasis;
    const value = this.opacity * fade;
    const transparent = value < FULL_OPACITY;
    if (this.material.transparent !== transparent) {
      this.material.transparent = transparent;
      this.material.depthWrite = !transparent;
      this.material.needsUpdate = true;
    }
    this.material.opacity = value;
  }
}

export class Translucency {
  private readonly entries: TranslucentMaterial[] = [];

  create(
    tracker: ResourceTracker,
    group: string,
    parameters: MeshStandardMaterialParameters,
    opacity: number,
  ): TranslucentMaterial {
    const entry = new TranslucentMaterial(group, parameters, opacity);
    tracker.track(entry.material);
    this.entries.push(entry);
    return entry;
  }

  sync(library: MaterialLibrary): void {
    this.entries.forEach((entry) => entry.apply(library.emphasisOf(entry.group)));
  }
}
