import { DynamicDrawUsage } from 'three';
import type { BufferAttribute, BufferGeometry } from 'three';
import { smoothstep } from '@core/math';
import { BALL_PIVOT } from '../../../rig/shoe';

const AXES = 3;
const BEND_HALF_M = 0.032;
const STILL_RAD = 1e-5;

export function bendShare(x: number): number {
  return smoothstep(x, BALL_PIVOT.x - BEND_HALF_M, BALL_PIVOT.x + BEND_HALF_M);
}

export class BendingGeometry {
  readonly geometry: BufferGeometry;
  private readonly restPositions: Float32Array;
  private readonly restNormals: Float32Array;
  private readonly shares: Float32Array;
  private readonly bends: boolean;
  private angle = 0;

  constructor(geometry: BufferGeometry) {
    this.geometry = geometry;
    const position = geometry.getAttribute('position') as BufferAttribute;
    const normal = geometry.getAttribute('normal') as BufferAttribute;
    this.restPositions = (position.array as Float32Array).slice();
    this.restNormals = (normal.array as Float32Array).slice();
    this.shares = new Float32Array(position.count);
    for (let v = 0; v < position.count; v++) {
      this.shares[v] = bendShare(this.restPositions[v * AXES]);
    }
    this.bends = this.shares.some((share) => share > 0);
    if (this.bends) {
      position.setUsage(DynamicDrawUsage);
      normal.setUsage(DynamicDrawUsage);
    }
  }

  bend(angle: number): void {
    if (!this.bends || Math.abs(angle - this.angle) < STILL_RAD) return;
    this.angle = angle;
    const position = this.geometry.getAttribute('position') as BufferAttribute;
    const normal = this.geometry.getAttribute('normal') as BufferAttribute;
    const positions = position.array as Float32Array;
    const normals = normal.array as Float32Array;
    const { restPositions, restNormals, shares } = this;
    for (let v = 0; v < shares.length; v++) {
      const at = v * AXES;
      const turn = shares[v] * angle;
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      const dx = restPositions[at] - BALL_PIVOT.x;
      const dy = restPositions[at + 1] - BALL_PIVOT.y;
      positions[at] = BALL_PIVOT.x + dx * cos - dy * sin;
      positions[at + 1] = BALL_PIVOT.y + dx * sin + dy * cos;
      const nx = restNormals[at];
      const ny = restNormals[at + 1];
      normals[at] = nx * cos - ny * sin;
      normals[at + 1] = nx * sin + ny * cos;
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }
}
