import { Mesh } from 'three';
import type { ShaderMaterial } from 'three';
import type { SpacingD } from '../../../ids';
import { HUB_HEIGHT_M } from '../../../model/constants';
import { terrainHeight, windArrowsX } from '../../../model/layout';
import { label, namedGroup, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { arrowGeometry } from './arrowGeometry';
import { advanceArrows, arrowMaterial } from './arrowMaterial';
import { WIND_ARROWS } from './constants';

const { count, spanZ, length } = WIND_ARROWS;

function arrowZ(index: number): number {
  return -spanZ / 2 + (spanZ * index) / (count - 1);
}

export class WindArrowsPart {
  readonly group = namedGroup('windArrows');
  private readonly arrows: readonly Mesh[];
  private readonly material: ShaderMaterial;

  constructor(context: PartContext) {
    this.material = registeredMaterial(context, 'windArrows', arrowMaterial(WIND_ARROWS));
    const tail = [-length / 2, 0, 0] as const;
    const geometry = context.tracker.track(
      arrowGeometry([{ tail, length, rate: 1 }], WIND_ARROWS, 'ground'),
    );
    this.arrows = Array.from({ length: count }, (_, index) => {
      const arrow = new Mesh(geometry, this.material);
      arrow.position.z = arrowZ(index);
      this.group.add(arrow);
      return arrow;
    });
    label(context, 'windArrows', this.group, [0, HUB_HEIGHT_M + WIND_ARROWS.labelLift, 0]);
  }

  place(spacing: SpacingD, turn: number): void {
    const x = windArrowsX(spacing);
    this.group.position.x = x;
    this.arrows.forEach((arrow) => {
      arrow.position.y = terrainHeight(x, arrow.position.z) + HUB_HEIGHT_M;
      arrow.rotation.y = turn;
    });
  }

  advance(metres: number): void {
    advanceArrows(this.material, metres);
  }
}
