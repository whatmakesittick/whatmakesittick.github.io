import { Quaternion, Vector3 } from 'three';
import { lerp, smoothstep } from '@core/math';
import type { AssemblyState } from '../../../ids';
import { BOND_LENGTH_A } from '../../../model';
import { EVENT_LOOK, IODINE_SPOT, THEME_GLOW } from '../../constants';
import type { DrawContext } from './draw';
import type { Pose } from './atomBatch';
import { SHAPES } from './shapes';

const LABEL_PRIORITY = 3;
const AXIS = new Vector3(1, 0.18, 0.32).normalize();
const APPROACH = new Vector3(0.15, -0.75, 0.62).normalize();
const SPIN_AXIS = new Vector3(0.3, 1, 0.2).normalize();
const SPIN = 1.4;
const MEET_IN = 0.22;
const FORM_OUT = [0, 0.35] as const;
const FORM_IN = [0.12, 0.5] as const;
const FLASH = [0.05, 0.95] as const;
const GRAB = [0, 0.45] as const;
const SPLIT = [0.5, 1] as const;
const CONVERT = [0.45, 0.6] as const;
const FADE_OUT = [0.85, 1] as const;
const LEAVE = 2.6;
const PROTON_OUT = 3.5;
const HALF = 0.5;
const UP = new Vector3(0, 1, 0);

function bell(value: number, [start, end]: readonly [number, number]): number {
  return Math.sin(Math.PI * smoothstep(value, start, end));
}

export class IodineEvent {
  private readonly centre = new Vector3(...IODINE_SPOT);
  private readonly left = new Vector3();
  private readonly right = new Vector3();
  private readonly spot = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly along = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), AXIS);
  private readonly facing = new Quaternion().setFromUnitVectors(UP, APPROACH.clone().negate());

  draw(draw: DrawContext, { iodineEvent, clock }: AssemblyState): void {
    if (!iodineEvent.active) return;
    const { stage, progress } = iodineEvent;
    this.rotation.setFromAxisAngle(SPIN_AXIS, clock.seconds * SPIN);
    if (stage === 'meet') this.meet(draw, progress);
    else if (stage === 'formed') this.formed(draw, progress);
    else this.eaten(draw, progress);
  }

  private pose(position: Vector3, rotation: Quaternion = this.rotation): Pose {
    return { position, rotation, scale: 1 };
  }

  private pair(distance: number): void {
    this.left
      .copy(AXIS)
      .multiplyScalar(-distance * HALF)
      .add(this.centre);
    this.right
      .copy(AXIS)
      .multiplyScalar(distance * HALF)
      .add(this.centre);
  }

  private meet(draw: DrawContext, progress: number): void {
    const presence = smoothstep(progress, 0, MEET_IN);
    this.pair(lerp(EVENT_LOOK.meetFrom, EVENT_LOOK.meetTo, smoothstep(progress)));
    draw.batch.molecule('iodate', SHAPES.iodate, this.pose(this.left), presence);
    draw.batch.molecule('iodide', SHAPES.iodide, this.pose(this.right), presence);
    draw.labels.offer('iodate', this.left, LABEL_PRIORITY - 1);
    draw.labels.offer('iodide', this.right, LABEL_PRIORITY);
  }

  private formed(draw: DrawContext, progress: number): void {
    const fading = 1 - smoothstep(progress, ...FORM_OUT);
    this.pair(EVENT_LOOK.meetTo * fading);
    draw.batch.molecule('iodate', SHAPES.iodate, this.pose(this.left), fading);
    draw.batch.molecule('iodide', SHAPES.iodide, this.pose(this.right), fading);
    const growing = smoothstep(progress, ...FORM_IN);
    draw.batch.molecule('iodine', SHAPES.iodine, this.pose(this.centre, this.along), growing);
    draw.flashes.add(this.centre, THEME_GLOW.flash, bell(progress, FLASH));
    draw.labels.offer('iodine', this.centre, LABEL_PRIORITY);
    draw.labels.offer('iodide', this.right, LABEL_PRIORITY - 1);
  }

  private eaten(draw: DrawContext, progress: number): void {
    const presence = 1 - smoothstep(progress, ...FADE_OUT);
    const split = smoothstep(progress, ...SPLIT);
    const converted = smoothstep(progress, ...CONVERT);
    const reach = lerp(EVENT_LOOK.grabFrom, LEAVE, smoothstep(progress, ...GRAB));
    this.spot
      .copy(APPROACH)
      .multiplyScalar(reach + split * EVENT_LOOK.grabFrom * HALF)
      .add(this.centre);
    const grabber = converted >= HALF ? 'sulfate' : 'bisulfite';
    draw.batch.molecule(grabber, SHAPES[grabber], this.pose(this.spot, this.facing), presence);
    draw.labels.offer(grabber, this.spot, LABEL_PRIORITY);
    if (split <= 0) {
      draw.batch.molecule('iodine', SHAPES.iodine, this.pose(this.centre, this.along), presence);
      draw.labels.offer('iodine', this.centre, LABEL_PRIORITY);
      return;
    }
    this.pair(lerp(BOND_LENGTH_A.iodine, EVENT_LOOK.partDistance * 2, split));
    draw.batch.atom('iodide', 'I', this.left, presence);
    draw.batch.atom('iodide', 'I', this.right, presence);
    draw.labels.offer('iodide', this.right, LABEL_PRIORITY);
    this.spot
      .addScaledVector(APPROACH, PROTON_OUT * split)
      .addScaledVector(AXIS, PROTON_OUT * split);
    draw.batch.atom('hydrogenIon', 'H', this.spot, presence * split);
    draw.halos.add(this.spot, THEME_GLOW.proton, presence * split);
  }
}
