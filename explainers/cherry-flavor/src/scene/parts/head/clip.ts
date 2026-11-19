import { CapsuleGeometry, CatmullRomCurve3, TorusGeometry, TubeGeometry, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { Point } from '../../../ids';
import { DETAIL } from '../../constants';
import { addMesh, namedGroup } from '../context';
import type { PartContext } from '../context';

const PIVOT: Point = [10.55, 2.25, -0.55];
const PAD = { radius: 0.32, length: 0.9, flatten: 0.55, gap: 1.05, tilt: -0.35 } as const;
const HINGE = { x: 1.9, radius: 0.34, tube: 0.09 } as const;
const ARM_RADIUS = 0.13;
const POP = { rate: 6, overshoot: 1.7, settled: 0.001 } as const;

export class NoseClip {
  private readonly group: Object3D;
  private shown = 0;
  private target = 0;

  constructor(context: PartContext, parent: Object3D) {
    this.group = namedGroup('noseClip', parent);
    this.group.position.set(...PIVOT);
    this.group.rotation.z = PAD.tilt;
    [-1, 1].forEach((side) => {
      const z = side * PAD.gap;
      const pad = new CapsuleGeometry(PAD.radius, PAD.length, 6, 14);
      pad.scale(1, 1, PAD.flatten);
      pad.translate(0, 0, z);
      addMesh(context, this.group, pad, 'nostrils', 'clip');
      const arm = new TubeGeometry(
        new CatmullRomCurve3([
          new Vector3(0, 0, z),
          new Vector3(HINGE.x * 0.55, 0.15, z * 0.8),
          new Vector3(HINGE.x, 0.05, z * 0.3),
        ]),
        16,
        ARM_RADIUS,
        DETAIL.tube,
        false,
      );
      addMesh(context, this.group, arm, 'nostrils', 'clip');
    });
    const spring = new TorusGeometry(HINGE.radius, HINGE.tube, 8, 24);
    spring.rotateY(Math.PI / 2);
    spring.translate(HINGE.x + HINGE.radius * 0.5, 0, 0);
    addMesh(context, this.group, spring, 'nostrils', 'clipSpring');
    this.apply();
  }

  setPinched(pinched: boolean, instant: boolean): void {
    this.target = pinched ? 1 : 0;
    if (instant) this.shown = this.target;
    this.apply();
  }

  update(deltaSeconds: number): boolean {
    const gap = this.target - this.shown;
    if (Math.abs(gap) < POP.settled) {
      this.shown = this.target;
      this.apply();
      return false;
    }
    this.shown += gap * Math.min(1, deltaSeconds * POP.rate);
    this.apply();
    return true;
  }

  private apply(): void {
    const share = this.shown;
    const pop = share * (1 + (POP.overshoot - 1) * share * (1 - share) * 4 * 0.25);
    this.group.visible = share > POP.settled;
    this.group.scale.setScalar(Math.max(pop, POP.settled));
  }
}
