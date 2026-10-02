import { clamp } from './math';

export interface Pose {
  x: number;
  z: number;
  heading: number;
}

export type Step = { kind: 'line'; length: number } | { kind: 'arc'; radius: number; turn: number };

interface PlacedStep {
  start: Pose;
  step: Step;
  offset: number;
  length: number;
}

export function line(length: number): Step {
  return { kind: 'line', length };
}

export function arc(radius: number, turn: number): Step {
  return { kind: 'arc', radius, turn };
}

function stepLength(step: Step): number {
  return step.kind === 'line' ? step.length : step.radius * Math.abs(step.turn);
}

function alongLine(start: Pose, distance: number): Pose {
  return {
    x: start.x + distance * Math.cos(start.heading),
    z: start.z + distance * Math.sin(start.heading),
    heading: start.heading,
  };
}

function alongArc(start: Pose, radius: number, turn: number, distance: number): Pose {
  const side = Math.sign(turn) * radius;
  const heading = start.heading + (Math.sign(turn) * distance) / radius;
  return {
    x: start.x - side * Math.sin(start.heading) + side * Math.sin(heading),
    z: start.z + side * Math.cos(start.heading) - side * Math.cos(heading),
    heading,
  };
}

export function poseAlong(start: Pose, step: Step, distance: number): Pose {
  return step.kind === 'line'
    ? alongLine(start, distance)
    : alongArc(start, step.radius, step.turn, distance);
}

export function rampedShare(share: number, rampIn: number, rampOut: number): number {
  const t = clamp(share, 0, 1);
  const topSpeed = 1 / (1 - rampIn / 2 - rampOut / 2);
  if (t < rampIn) return (topSpeed * t * t) / (2 * rampIn);
  if (t > 1 - rampOut) return 1 - (topSpeed * (1 - t) ** 2) / (2 * rampOut);
  return topSpeed * (t - rampIn / 2);
}

export class Route {
  readonly length: number;
  readonly end: Pose;
  private readonly placed: readonly PlacedStep[];

  constructor(start: Pose, steps: readonly Step[]) {
    const placed: PlacedStep[] = [];
    let pose = start;
    let offset = 0;
    for (const step of steps) {
      const length = stepLength(step);
      placed.push({ start: pose, step, offset, length });
      pose = poseAlong(pose, step, length);
      offset += length;
    }
    this.placed = placed;
    this.length = offset;
    this.end = pose;
  }

  poseAt(share: number): Pose {
    const distance = this.distanceAt(share);
    const current = this.placedAt(distance);
    return poseAlong(current.start, current.step, distance - current.offset);
  }

  turnAt(share: number): number {
    const { step } = this.placedAt(this.distanceAt(share));
    return step.kind === 'arc' ? Math.sign(step.turn) : 0;
  }

  private distanceAt(share: number): number {
    return clamp(share, 0, 1) * this.length;
  }

  private placedAt(distance: number): PlacedStep {
    return (
      this.placed.find((placed) => distance <= placed.offset + placed.length) ??
      this.placed[this.placed.length - 1]
    );
  }
}
