import { Object3D } from 'three';
import type { Vector3 } from 'three';
import { AXLE, C_RING, GATE, HEAD, PERIPHERAL_STALK, spanMiddle } from '../../../model/scale';
import { ringLayout } from '../../geometry/ringLayout';
import { polar } from '../../geometry/solids';
import type { PartId } from '../../../ids';
import { stalkShift } from './stator';

export type MotorPartId = Extract<
  PartId,
  'cRing' | 'centralStalk' | 'subunitA' | 'peripheralStalk' | 'alphaSubunits' | 'betaSubunits'
>;

const FRONT_DEG = 270;
const LABEL = {
  ringDeg: 250,
  ringDrop: 0.5,
  gateDeg: 36,
  stalkY: 5,
  alphaDeg: 210,
  axleY: spanMiddle([AXLE.foot[1], HEAD.span[0]]),
  headY: spanMiddle(HEAD.span),
  headSink: 0.15,
} as const;

function place(anchor: Object3D, point: Vector3): void {
  anchor.position.copy(point);
}

export class MotorLabels {
  readonly anchors: ReadonlyMap<MotorPartId, Object3D>;
  private readonly byPart: Record<MotorPartId, Object3D>;

  constructor(parent: Object3D, bladeCount: number) {
    this.byPart = {
      cRing: new Object3D(),
      centralStalk: new Object3D(),
      subunitA: new Object3D(),
      peripheralStalk: new Object3D(),
      alphaSubunits: new Object3D(),
      betaSubunits: new Object3D(),
    };
    Object.values(this.byPart).forEach((anchor) => parent.add(anchor));
    this.anchors = new Map(Object.entries(this.byPart) as [MotorPartId, Object3D][]);
    const headReach = HEAD.radius - LABEL.headSink;
    place(this.byPart.centralStalk, polar(FRONT_DEG, AXLE.gammaRadius, LABEL.axleY));
    place(this.byPart.alphaSubunits, polar(LABEL.alphaDeg, headReach, LABEL.headY));
    place(this.byPart.betaSubunits, polar(FRONT_DEG, headReach, LABEL.headY));
    this.setBladeCount(bladeCount);
  }

  setBladeCount(bladeCount: number): void {
    const { outerRadius, growth } = ringLayout(bladeCount);
    const gateMiddle = spanMiddle([GATE.innerRadius, GATE.outerRadius]) + growth;
    const stalkRadius = PERIPHERAL_STALK.radius + stalkShift(LABEL.stalkY, growth);
    place(this.byPart.cRing, polar(LABEL.ringDeg, outerRadius, C_RING.height[1] - LABEL.ringDrop));
    place(this.byPart.subunitA, polar(LABEL.gateDeg, gateMiddle, GATE.span[1]));
    place(
      this.byPart.peripheralStalk,
      polar(PERIPHERAL_STALK.azimuthDeg, stalkRadius, LABEL.stalkY),
    );
  }
}
