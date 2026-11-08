import type { Object3D } from 'three';
import type { PartId, Point } from '../../../ids';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';

export class LabelSet {
  private readonly context: PartContext;
  private readonly holders: Object3D[] = [];

  constructor(context: PartContext) {
    this.context = context;
  }

  add(part: PartId, parent: Object3D, point: Point): void {
    const holder = namedGroup(`${part}Label`, parent);
    label(this.context, part, holder, point);
    this.holders.push(holder);
  }

  show(visible: boolean): void {
    this.holders.forEach((holder) => {
      holder.visible = visible;
    });
  }
}
