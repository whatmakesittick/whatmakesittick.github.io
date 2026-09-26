import { MeshStandardMaterial } from 'three';
import type { Material, MeshStandardMaterialParameters } from 'three';

export type MaterialFinish = Readonly<MeshStandardMaterialParameters>;

export const STRUCTURE_GROUP = 'structure';

const FULL_EMPHASIS = 0.999;

export function createMaterial(finish: MaterialFinish): MeshStandardMaterial {
  return new MeshStandardMaterial(finish);
}

function applyOpacity(material: Material, emphasis: number): void {
  const transparent = emphasis < FULL_EMPHASIS;
  if (material.transparent !== transparent) {
    material.transparent = transparent;
    material.needsUpdate = true;
  }
  material.opacity = emphasis;
}

export class MaterialLibrary {
  private readonly finishes = new Map<string, Map<MaterialFinish, MeshStandardMaterial>>();
  private readonly extras = new Map<string, Set<Material>>();
  private readonly emphasis = new Map<string, number>();

  get(group: string, finish: MaterialFinish): MeshStandardMaterial {
    let byFinish = this.finishes.get(group);
    if (!byFinish) {
      byFinish = new Map();
      this.finishes.set(group, byFinish);
    }
    let material = byFinish.get(finish);
    if (!material) {
      material = createMaterial(finish);
      applyOpacity(material, this.emphasisOf(group));
      byFinish.set(finish, material);
    }
    return material;
  }

  register(group: string, material: Material): void {
    let set = this.extras.get(group);
    if (!set) {
      set = new Set();
      this.extras.set(group, set);
    }
    set.add(material);
    applyOpacity(material, this.emphasisOf(group));
  }

  clearRegistered(): void {
    this.extras.clear();
  }

  emphasisOf(group: string): number {
    return this.emphasis.get(group) ?? 1;
  }

  setEmphasis(group: string, value: number): void {
    if (this.emphasisOf(group) === value) return;
    this.emphasis.set(group, value);
    this.finishes.get(group)?.forEach((material) => applyOpacity(material, value));
    this.extras.get(group)?.forEach((material) => applyOpacity(material, value));
  }

  dispose(): void {
    this.finishes.forEach((byFinish) => byFinish.forEach((material) => material.dispose()));
    this.finishes.clear();
    this.extras.clear();
  }
}
