import type { Object3D } from 'three';

export class CutawaySwitch {
  private readonly wholeParts: Object3D[] = [];
  private readonly openedParts: Object3D[] = [];
  private cut = false;

  whole<T extends Object3D>(object: T): T {
    this.wholeParts.push(object);
    object.visible = !this.cut;
    return object;
  }

  opened<T extends Object3D>(object: T): T {
    this.openedParts.push(object);
    object.visible = this.cut;
    return object;
  }

  set(cut: boolean): void {
    this.cut = cut;
    this.wholeParts.forEach((object) => (object.visible = !cut));
    this.openedParts.forEach((object) => (object.visible = cut));
  }
}
