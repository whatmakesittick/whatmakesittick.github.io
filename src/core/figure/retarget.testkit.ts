/// <reference types="node" />

import { readFileSync } from 'node:fs';
import type { Figure } from './figure';
import { createRetargetTarget } from './retarget';
import type { Point, RetargetTarget, Side } from './retarget';
import { apply, applyTransposed, cross, mul, normalize, scale, sub, transpose } from './rotations';
import type { Mat, Vec } from './rotations';

const PREFIX: Readonly<Record<Side, string>> = { right: 'r', left: 'l' };
const PALM_SIDE: Readonly<Record<Side, number>> = { right: -1, left: 1 };
const DOWN: Vec = [0, -1, 0];

interface SampleMeta {
  readonly step: number;
  readonly columns: readonly string[];
  readonly poses: number;
}

export function loadSwimSamples(figure: Figure, fixtures: URL): Float32Array[] {
  const meta = JSON.parse(
    readFileSync(new URL('swim-samples.json', fixtures), 'utf8'),
  ) as SampleMeta;
  const file = readFileSync(new URL('swim-samples.bin', fixtures));
  const raw = new Int16Array(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  return Array.from({ length: meta.poses }, (_, pose) => {
    const parameters = figure.createParameters();
    meta.columns.forEach((name, column) => {
      parameters[figure.parameterIndex(name)] =
        raw[pose * meta.columns.length + column] * meta.step;
    });
    return parameters;
  });
}

function set(out: Point, v: Vec): void {
  [out.x, out.y, out.z] = v;
}

export class TargetReader {
  private readonly figure: Figure;
  private readonly restPositions: Vec[];
  private readonly restRotations: Mat[];

  constructor(figure: Figure) {
    this.figure = figure;
    figure.solveSkeleton(figure.createParameters());
    this.restPositions = Array.from({ length: figure.jointCount }, (_, j) => this.position(j));
    this.restRotations = Array.from({ length: figure.jointCount }, (_, j) => this.rotation(j));
  }

  read(parameters: Float32Array): RetargetTarget {
    this.figure.solveSkeleton(parameters);
    const target = createRetargetTarget();
    (['right', 'left'] as const).forEach((side) => {
      this.readArm(side, target);
      this.readLeg(side, target);
    });
    const head = this.turn('c_head');
    const q = quaternion(head);
    Object.assign(target.head, q);
    return target;
  }

  private index(name: string): number {
    return this.figure.jointIndex(name);
  }

  private position(j: number): Vec {
    const p = this.figure.jointPositions;
    return [p[j * 3], p[j * 3 + 1], p[j * 3 + 2]];
  }

  private rotation(j: number): Mat {
    return this.figure.jointMatrices.slice(j * 9, j * 9 + 9);
  }

  private pos(name: string): Vec {
    return this.position(this.index(name));
  }

  private turn(name: string): Mat {
    const j = this.index(name);
    return mul(this.rotation(j), transpose(this.restRotations[j]));
  }

  private rest(name: string): Vec {
    return this.restPositions[this.index(name)];
  }

  private readArm(side: Side, target: RetargetTarget): void {
    const p = PREFIX[side];
    const arm = target.arms[side];
    set(arm.shoulder, this.pos(`${p}_uparm`));
    set(arm.elbow, this.pos(`${p}_lowarm`));
    set(arm.wrist, this.pos(`${p}_wrist`));
    set(arm.handAxis, normalize(sub(this.pos(`${p}_middle_null`), this.pos(`${p}_wrist`))));
    const axis = sub(this.rest(`${p}_middle_null`), this.rest(`${p}_wrist`));
    const across = sub(this.rest(`${p}_index1`), this.rest(`${p}_pinky1`));
    const palm = scale(normalize(cross(axis, across)), PALM_SIDE[side]);
    set(arm.palm, apply(this.turn(`${p}_wrist`), palm));
  }

  private readLeg(side: Side, target: RetargetTarget): void {
    const p = PREFIX[side];
    const leg = target.legs[side];
    set(leg.hip, this.pos(`${p}_upleg`));
    set(leg.knee, this.pos(`${p}_lowleg`));
    set(leg.ankle, this.pos(`${p}_foot`));
    const axis = normalize(sub(this.rest(`${p}_ball`), this.rest(`${p}_foot`)));
    set(leg.footAxis, apply(this.turn(`${p}_transversetarsal`), axis));
    const sole = normalize(
      sub(DOWN, scale(axis, DOWN[0] * axis[0] + DOWN[1] * axis[1] + DOWN[2] * axis[2])),
    );
    set(leg.sole, apply(this.turn(`${p}_transversetarsal`), sole));
  }
}

function quaternion(m: Mat): { x: number; y: number; z: number; w: number } {
  const w = Math.sqrt(Math.max(0, 1 + m[0] + m[4] + m[8])) / 2;
  if (w > 1e-6)
    return {
      w,
      x: (m[7] - m[5]) / (4 * w),
      y: (m[2] - m[6]) / (4 * w),
      z: (m[3] - m[1]) / (4 * w),
    };
  const x = Math.sqrt(Math.max(0, 1 + m[0] - m[4] - m[8])) / 2;
  return { x, y: (m[1] + m[3]) / (4 * x), z: (m[2] + m[6]) / (4 * x), w: 0 };
}

export { applyTransposed };
