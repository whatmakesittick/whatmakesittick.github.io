import { Vector3 } from 'three';
import type { Point } from '../../../ids';
import { BUILDING, ROOF_Y, SUBJECT_RACK } from '../../../model';
import type { PathLeg } from '../../../model';
import { PITCH, RACK_ZONE } from './constants';

export type Pitch = (middle: Vector3) => number;

export interface Span {
  readonly from: Vector3;
  readonly to: Vector3;
  readonly direction: Vector3;
  readonly start: number;
  readonly length: number;
  readonly flowStart: number;
  readonly flowLength: number;
}

const MIN_SPAN_M = 1e-6;

function inside(value: number, [low, high]: readonly [number, number]): boolean {
  return value >= low && value <= high;
}

export const zonePitch: Pitch = ({ x, y, z }) => {
  const nearRack =
    Math.abs(x - SUBJECT_RACK[0]) < RACK_ZONE.halfX &&
    Math.abs(z - SUBJECT_RACK[2]) < RACK_ZONE.halfZ &&
    y < RACK_ZONE.top;
  if (nearRack) return PITCH.rack;
  const indoor = inside(x, BUILDING.x) && inside(z, BUILDING.z) && y < ROOF_Y;
  return indoor ? PITCH.building : PITCH.outdoor;
};

export function fixedPitch(metres: number): Pitch {
  return () => metres;
}

export function legPoints(legs: readonly PathLeg[]): Point[] {
  return legs.flatMap(({ points }, index) => (index === 0 ? points : points.slice(1)));
}

export class Track {
  readonly spans: readonly Span[];
  readonly length: number;
  readonly flow: number;

  constructor(points: readonly Point[], pitch: Pitch = zonePitch) {
    const spans: Span[] = [];
    let start = 0;
    let flowStart = 0;
    points.slice(1).forEach((point, index) => {
      const from = new Vector3(...points[index]);
      const to = new Vector3(...point);
      const length = from.distanceTo(to);
      if (length < MIN_SPAN_M) return;
      const middle = from.clone().lerp(to, 0.5);
      const flowLength = length / pitch(middle);
      const direction = to.clone().sub(from).normalize();
      spans.push({ from, to, direction, start, length, flowStart, flowLength });
      start += length;
      flowStart += flowLength;
    });
    this.spans = spans;
    this.length = start;
    this.flow = flowStart;
  }

  spanAtFlow(flow: number): Span {
    const last = this.spans[this.spans.length - 1];
    return this.spans.find((span) => span.flowStart + span.flowLength >= flow) ?? last;
  }

  pointAt(flow: number, target: Vector3): Span {
    const span = this.spanAtFlow(flow);
    const along = span.flowLength > 0 ? (flow - span.flowStart) / span.flowLength : 0;
    target.copy(span.from).lerp(span.to, Math.min(Math.max(along, 0), 1));
    return span;
  }

  flowAtMetres(metres: number): number {
    if (metres >= this.length) return this.flow;
    if (metres <= 0) return 0;
    const span = this.spans.find(({ start, length }) => start + length >= metres) ?? this.spans[0];
    return span.flowStart + ((metres - span.start) / span.length) * span.flowLength;
  }
}
