import { Quaternion, Vector3 } from 'three';
import { lerp, smoothstep } from '@core/math';
import type { AssemblyState, PartId } from '../../../ids';
import { BOND_LENGTH_A, OXYGEN_HOPS } from '../../../model';
import { EVENT_LOOK, LANDOLT_SPOT, THEME_GLOW } from '../../constants';
import type { DrawContext } from './draw';
import {
  IODATE_POLAR,
  SULFITE_POLAR,
  TETRA_POLAR,
  hydroxylHydrogen,
  legAzimuth,
  legDirection,
} from './shapes';

const UP = new Vector3(0, 1, 0);
const LEGS = [0, 1, 2] as const;
const LABEL_PRIORITY = 3;
const TRAVEL = [0.1, 0.6] as const;
const CONVERT = [0.55, 0.75] as const;
const RELEASE = [0.6, 1] as const;
const LEAVE_BOND = 0.25;
const JOIN_BOND = 0.75;
const HANDOVER = 0.5;
const SPREAD = 0.14;
const SPREAD_FROM = 2.65;
const IODIDE_FROM = 2.5;
const SPARK = [0.5, 0.85] as const;
const SPARK_ALPHA = 0.85;

interface Leg {
  readonly direction: Vector3;
  readonly arc: Vector3;
  readonly turn: Quaternion;
}

function bell(value: number, [start, end]: readonly [number, number]): number {
  const share = smoothstep(value, start, end);
  return Math.sin(Math.PI * share);
}

export class LandoltEvent {
  private readonly centre = new Vector3(...LANDOLT_SPOT);
  private readonly legs: readonly Leg[];
  private readonly sulfur = new Vector3();
  private readonly oxygen = new Vector3();
  private readonly start = new Vector3();
  private readonly end = new Vector3();
  private readonly hydrogen = new Vector3();
  private readonly local = new Vector3();

  constructor() {
    const frame = new Quaternion().setFromUnitVectors(
      UP,
      new Vector3(...EVENT_LOOK.clusterTilt).normalize(),
    );
    const lonePair = UP.clone().applyQuaternion(frame);
    this.legs = LEGS.map((leg) => {
      const direction = legDirection(IODATE_POLAR, legAzimuth(leg)).applyQuaternion(frame);
      const arc = lonePair.clone().addScaledVector(direction, -lonePair.dot(direction)).normalize();
      const turn = new Quaternion().setFromUnitVectors(UP, direction.clone().negate());
      return { direction, arc, turn };
    });
  }

  draw(draw: DrawContext, { landolt }: AssemblyState): void {
    if (!landolt.active) return;
    const hop = landolt.hop;
    const current = Math.min(OXYGEN_HOPS - 1, Math.floor(hop));
    const share = hop - current;
    const presence =
      smoothstep(hop, 0, EVENT_LOOK.fadeIn) *
      (1 - smoothstep(hop, OXYGEN_HOPS - EVENT_LOOK.fadeOut, OXYGEN_HOPS));
    const spread = 1 + SPREAD * smoothstep(hop, SPREAD_FROM, OXYGEN_HOPS);
    const iodinePart: PartId = hop >= IODIDE_FROM ? 'iodide' : 'iodate';
    draw.batch.atom(iodinePart, 'I', this.centre, presence);
    draw.labels.offer(iodinePart, this.centre, LABEL_PRIORITY);
    this.legs.forEach((leg, index) => {
      const converted = index < current ? 1 : index === current ? smoothstep(share, ...CONVERT) : 0;
      const travel = index < current ? 1 : index === current ? smoothstep(share, ...TRAVEL) : 0;
      const released = index < current ? 1 : index === current ? smoothstep(share, ...RELEASE) : 0;
      this.sulfur
        .copy(leg.direction)
        .multiplyScalar(EVENT_LOOK.bisulfiteDistance * spread)
        .add(this.centre);
      this.drawHop(draw, leg, travel, iodinePart, converted, presence);
      this.drawSulfur(draw, leg, converted, released, presence);
      if (index === current) {
        draw.halos.add(this.sulfur, THEME_GLOW.flash, bell(share, SPARK) * SPARK_ALPHA * presence);
      }
    });
  }

  private drawHop(
    draw: DrawContext,
    leg: Leg,
    travel: number,
    iodinePart: PartId,
    converted: number,
    presence: number,
  ): void {
    this.start.copy(leg.direction).multiplyScalar(BOND_LENGTH_A.iodineOxygen).add(this.centre);
    this.end
      .copy(leg.direction)
      .multiplyScalar(-BOND_LENGTH_A.sulfateSulfurOxygen)
      .add(this.sulfur);
    this.oxygen
      .lerpVectors(this.start, this.end, travel)
      .addScaledVector(leg.arc, EVENT_LOOK.hopArc * Math.sin(Math.PI * travel));
    const owner: PartId =
      travel < HANDOVER ? iodinePart : converted >= HANDOVER ? 'sulfate' : 'bisulfite';
    draw.batch.atom(owner, 'O', this.oxygen, presence);
    if (travel < LEAVE_BOND) {
      draw.batch.bond(owner, this.centre, this.oxygen, presence * (1 - travel / LEAVE_BOND));
    }
    if (travel > JOIN_BOND) {
      draw.batch.bond(owner, this.sulfur, this.oxygen, presence * smoothstep(travel, JOIN_BOND, 1));
    }
  }

  private drawSulfur(
    draw: DrawContext,
    leg: Leg,
    converted: number,
    released: number,
    presence: number,
  ): void {
    const part: PartId = converted >= HANDOVER ? 'sulfate' : 'bisulfite';
    draw.batch.atom(part, 'S', this.sulfur, presence);
    draw.labels.offer(part, this.sulfur, LABEL_PRIORITY - converted);
    const polar = lerp(SULFITE_POLAR, TETRA_POLAR, converted);
    const length = lerp(
      BOND_LENGTH_A.bisulfiteSulfurOxygen,
      BOND_LENGTH_A.sulfateSulfurOxygen,
      converted,
    );
    LEGS.forEach((index) => {
      this.local.copy(legDirection(polar, legAzimuth(index))).multiplyScalar(length);
      if (index === 0) this.hydrogen.copy(hydroxylHydrogen(this.local));
      this.oxygen.copy(this.local).applyQuaternion(leg.turn).add(this.sulfur);
      draw.batch.atom(part, 'O', this.oxygen, presence);
      draw.batch.bond(part, this.sulfur, this.oxygen, presence);
      if (index === 0) this.drawProton(draw, leg, part, released, presence);
    });
  }

  private drawProton(
    draw: DrawContext,
    leg: Leg,
    part: PartId,
    released: number,
    presence: number,
  ): void {
    const attached = this.local.copy(this.hydrogen).applyQuaternion(leg.turn).add(this.sulfur);
    if (released <= 0) {
      draw.batch.atom(part, 'H', attached, presence);
      draw.batch.bond(part, this.oxygen, attached, presence);
      return;
    }
    attached.addScaledVector(leg.direction, EVENT_LOOK.protonReach * released);
    draw.batch.atom('hydrogenIon', 'H', attached, presence);
    draw.halos.add(attached, THEME_GLOW.proton, presence * released);
    draw.labels.offer('hydrogenIon', attached, LABEL_PRIORITY);
  }
}
