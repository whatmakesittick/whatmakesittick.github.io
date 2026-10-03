import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import { clamp } from '@core/math';
import { MOTOR_PART_IDS } from '../../../ids';
import type { MotorPartId, MotorShares } from '../../../ids';
import { MOTOR_POSITIONS, MOTOR_SPIN } from '../../../model/layout';
import { THEME } from '../../../theme';
import { SPIN_ARROWS } from '../../constants';
import { ARROW_PLANE } from '../../finishes';
import { spinArrowTexture } from '../../geometry/arrowTexture';
import { registered } from '../context';
import type { PartContext } from '../context';

const QUARTER_TURN = Math.PI / 2;

export function arrowBrightness(shares: MotorShares): number[] {
  const { base, gain, min } = SPIN_ARROWS.brightness;
  const mean = shares.reduce((sum, share) => sum + share, 0) / shares.length;
  return shares.map((share) => clamp(base + (share - mean) * gain, min, 1));
}

export function motorNumber(id: MotorPartId): number {
  return MOTOR_PART_IDS.indexOf(id) + 1;
}

export class SpinArrowsPart {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly materials: MeshBasicMaterial[] = [];

  constructor(context: PartContext) {
    const plane = context.tracker.track(new PlaneGeometry(SPIN_ARROWS.size, SPIN_ARROWS.size));
    plane.rotateX(-QUARTER_TURN);
    plane.rotateY(-QUARTER_TURN);
    let frontLeft: Mesh | null = null;
    for (const id of MOTOR_PART_IDS) {
      const direction = MOTOR_SPIN[id];
      const colour = direction === 'clockwise' ? THEME.clockwise : THEME.counterClockwise;
      const material = registered(
        context,
        'spinArrows',
        new MeshBasicMaterial({
          ...ARROW_PLANE,
          color: colour,
          map: context.tracker.track(
            spinArrowTexture(SPIN_ARROWS.texture, direction, String(motorNumber(id))),
          ),
        }),
      );
      const arrow = new Mesh(plane, material);
      const [x, , z] = MOTOR_POSITIONS[id];
      arrow.position.set(x, SPIN_ARROWS.lift, z);
      this.materials.push(material);
      this.object.add(arrow);
      if (id === 'motorFrontLeft') frontLeft = arrow;
    }
    this.label = frontLeft ?? this.object;
  }

  setState(shown: boolean, shares: MotorShares): void {
    this.object.visible = shown;
    arrowBrightness(shares).forEach((level, index) => (this.materials[index].opacity = level));
  }
}
