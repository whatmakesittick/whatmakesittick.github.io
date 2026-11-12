import { BufferAttribute, CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Color } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lerp } from '@core/math';
import type { Point } from '../../../ids';
import { vector } from '../kit';

const UP = new Vector3(0, 1, 0);
const HALF = 0.5;
const CHANNELS = 3;

export function segmentGeometry(
  from: Point,
  to: Point,
  radius: number,
  sides: number,
  openEnded = false,
): BufferGeometry {
  const start = vector(from);
  const direction = vector(to).sub(start);
  const geometry = new CylinderGeometry(radius, radius, direction.length(), sides, 1, openEnded);
  const rotation = new Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
  const middle = start.clone().addScaledVector(direction, HALF);
  return geometry.applyMatrix4(new Matrix4().compose(middle, rotation, new Vector3(1, 1, 1)));
}

function withWhiteColors(geometry: BufferGeometry): BufferGeometry {
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(count * CHANNELS).fill(1), CHANNELS),
  );
  return geometry;
}

function axisPositions(points: readonly Point[], sides: number): Float32Array {
  const legs = points
    .slice(1)
    .map((point, index) => segmentGeometry(points[index], point, 0, sides, true));
  const merged = mergeGeometries(legs, false);
  const positions = Float32Array.from(merged.getAttribute('position').array);
  [...legs, merged].forEach((geometry) => geometry.dispose());
  return positions;
}

export class LegSet {
  readonly geometry: BufferGeometry;
  private readonly counts: readonly number[];
  private readonly rim: Float32Array;
  private readonly axis: Float32Array;

  constructor(points: readonly Point[], radius: number, sides: number) {
    const legs = points
      .slice(1)
      .map((point, index) =>
        withWhiteColors(segmentGeometry(points[index], point, radius, sides, true)),
      );
    this.counts = legs.map((leg) => leg.getAttribute('position').count);
    this.geometry = mergeGeometries(legs, false);
    legs.forEach((leg) => leg.dispose());
    this.rim = Float32Array.from(this.geometry.getAttribute('position').array);
    this.axis = axisPositions(points, sides);
  }

  paint(levels: readonly number[], color: Color, scale = 1): void {
    const colors = this.geometry.getAttribute('color') as BufferAttribute;
    let vertex = 0;
    this.counts.forEach((count, leg) => {
      const level = levels[leg] * scale;
      for (let index = 0; index < count; index += 1) {
        colors.setXYZ(vertex + index, color.r * level, color.g * level, color.b * level);
      }
      vertex += count;
    });
    colors.needsUpdate = true;
  }

  thin(share: number): void {
    const positions = this.geometry.getAttribute('position') as BufferAttribute;
    const values = positions.array;
    for (let index = 0; index < values.length; index += 1) {
      values[index] = lerp(this.axis[index], this.rim[index], share);
    }
    positions.needsUpdate = true;
  }
}
