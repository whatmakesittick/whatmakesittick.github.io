import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { clamp } from '@core/math';
import { ROTOR_RADIUS_M } from '../../../model/constants';
import { TURBINE_GEOMETRY } from '../../../model/layout';
import { STREAMLINES } from './constants';
import { lineRadius, lineSpeed, upstreamRadius } from './streamTube';

interface Aim {
  readonly up: number;
  readonly across: number;
  readonly disc: number;
}

const XYZ = 3;
const SIDES = [-1, 1] as const;
const GOLDEN = 0.6180339887;
const [HUB_X, HUB_Y, HUB_Z] = TURBINE_GEOMETRY.hub;
const { samples, startX, endX } = STREAMLINES;

function lineAims(): readonly Aim[] {
  return STREAMLINES.rowsAcross.flatMap((up) =>
    STREAMLINES.columnsAcross.map((across) => {
      const disc = Math.hypot(up, across);
      return { up: up / disc, across: across / disc, disc };
    }),
  );
}

export function softFloor(y: number, floor: number, blend: number): number {
  const knee = floor + blend;
  return y >= knee ? y : floor + blend * Math.exp((y - knee) / blend);
}

function vertexIndex(line: number, sample: number, side: number): number {
  return (line * samples + sample) * SIDES.length + side;
}

function ribbonIndices(lines: number): number[] {
  const indices: number[] = [];
  for (let line = 0; line < lines; line += 1) {
    for (let sample = 0; sample < samples - 1; sample += 1) {
      const [a, b] = [vertexIndex(line, sample, 0), vertexIndex(line, sample, 1)];
      const [c, d] = [vertexIndex(line, sample + 1, 0), vertexIndex(line, sample + 1, 1)];
      indices.push(a, c, b, b, c, d);
    }
  }
  return indices;
}

export class StreamlineGeometry {
  readonly geometry = new BufferGeometry();
  readonly lineCount: number;
  private readonly aims = lineAims();
  private readonly centres: Float32Array;
  private readonly tangents: Float32Array;
  private readonly travel: Float32Array;
  private readonly points = Array.from({ length: samples }, () => new Vector3());
  private readonly speeds = new Float32Array(samples);
  private readonly tangent = new Vector3();

  constructor() {
    this.lineCount = this.aims.length;
    const vertices = this.lineCount * samples * SIDES.length;
    this.centres = new Float32Array(vertices * XYZ);
    this.tangents = new Float32Array(vertices * XYZ);
    this.travel = new Float32Array(vertices);
    const sides = new Float32Array(vertices);
    const shares = new Float32Array(vertices);
    for (let vertex = 0; vertex < vertices; vertex += 1) {
      sides[vertex] = SIDES[vertex % SIDES.length];
      shares[vertex] = (Math.floor(vertex / SIDES.length) % samples) / (samples - 1);
    }
    this.geometry.setAttribute('position', new BufferAttribute(this.centres, XYZ));
    this.geometry.setAttribute('aTangent', new BufferAttribute(this.tangents, XYZ));
    this.geometry.setAttribute('aTravel', new BufferAttribute(this.travel, 1));
    this.geometry.setAttribute('aSide', new BufferAttribute(sides, 1));
    this.geometry.setAttribute('aShare', new BufferAttribute(shares, 1));
    this.geometry.setIndex(ribbonIndices(this.lineCount));
  }

  shape(induction: number): void {
    const share = clamp(induction, 0, STREAMLINES.maxInduction);
    this.aims.forEach((aim, line) => this.shapeLine(aim, line, share));
    ['position', 'aTangent', 'aTravel'].forEach((name) => {
      this.geometry.getAttribute(name).needsUpdate = true;
    });
    this.geometry.computeBoundingSphere();
  }

  private shapeLine(aim: Aim, line: number, induction: number): void {
    const upstream = upstreamRadius(induction, aim.disc);
    this.points.forEach((point, sample) => {
      const x = startX + ((endX - startX) * sample) / (samples - 1);
      const xi = (x - HUB_X) / ROTOR_RADIUS_M;
      const radius = lineRadius(induction, upstream, xi) * ROTOR_RADIUS_M;
      const y = softFloor(HUB_Y + radius * aim.up, STREAMLINES.floorY, STREAMLINES.floorBlend);
      point.set(x, y, HUB_Z + radius * aim.across);
      this.speeds[sample] = lineSpeed(induction, upstream, xi);
    });
    let travel = (line * GOLDEN * STREAMLINES.dashPeriod) % STREAMLINES.dashPeriod;
    this.points.forEach((point, sample) => {
      if (sample > 0) {
        const previous = this.points[sample - 1];
        const speed = (this.speeds[sample] + this.speeds[sample - 1]) / 2;
        travel += point.distanceTo(previous) / speed;
      }
      this.writeSample(line, sample, point, travel);
    });
  }

  private writeSample(line: number, sample: number, point: Vector3, travel: number): void {
    const before = this.points[Math.max(sample - 1, 0)];
    const after = this.points[Math.min(sample + 1, samples - 1)];
    this.tangent.subVectors(after, before).normalize();
    SIDES.forEach((_, side) => {
      const vertex = vertexIndex(line, sample, side);
      point.toArray(this.centres, vertex * XYZ);
      this.tangent.toArray(this.tangents, vertex * XYZ);
      this.travel[vertex] = travel;
    });
  }
}
