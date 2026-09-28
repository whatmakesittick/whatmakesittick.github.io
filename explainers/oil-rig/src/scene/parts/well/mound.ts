import { Group, LatheGeometry, Shape, ShapeGeometry, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { clamp, smoothstep } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { SEABED_Y } from '../../../model/scale';
import { MOUND } from '../../constants';
import { merge } from '../../geometry/merge';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const HALF_TURN = Math.PI;
const QUARTER_TURN = Math.PI / 2;
const SINK = 0.05;
const SEAM = 1e-3;
const HASH = { x: 12.9898, z: 78.233, scale: 43758.5453 } as const;

function height(radius: number): number {
  const rising = smoothstep(radius, MOUND.inner, MOUND.peak);
  const falling = 1 - smoothstep(radius, MOUND.peak, MOUND.outer);
  return MOUND.height * rising * falling;
}

function profile(): Vector2[] {
  return Array.from({ length: MOUND.steps + 1 }, (_, index) => {
    const radius = MOUND.inner + ((MOUND.outer - MOUND.inner) * index) / MOUND.steps;
    return new Vector2(radius, height(radius) - SINK);
  });
}

function bump(x: number, z: number): number {
  const value = Math.sin(x * HASH.x + z * HASH.z) * HASH.scale;
  return value - Math.floor(value) - 1 / 2;
}

function roughen(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index++) {
    const lift = position.getY(index) + SINK;
    const onSeam = Math.abs(position.getZ(index)) < SEAM;
    if (lift <= 0 || onSeam) continue;
    const offset = bump(position.getX(index), position.getZ(index)) * MOUND.jitter * 2;
    position.setY(index, position.getY(index) + offset * clamp(lift, 0, 1));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function half(start: number): BufferGeometry {
  const outsideIn = profile().reverse();
  return roughen(new LatheGeometry(outsideIn, MOUND.segments, start, HALF_TURN).toNonIndexed());
}

function cutFace(): BufferGeometry {
  const points = profile();
  const outline = new Shape();
  outline.moveTo(-MOUND.outer, -SINK);
  [...points].reverse().forEach((point) => outline.lineTo(-point.x, point.y));
  outline.lineTo(-MOUND.inner, -SINK);
  outline.lineTo(-MOUND.outer, -SINK);
  const left = new ShapeGeometry(outline);
  const right = left.clone();
  right.scale(-1, 1, 1);
  right.index?.array.reverse();
  return merge([left, right]);
}

export class MoundPart {
  readonly object = new Group();
  private readonly front = new Group();

  constructor(context: PartContext) {
    const back = merge([half(QUARTER_TURN), cutFace()]);
    this.front.add(partMesh(context, half(-QUARTER_TURN), STRUCTURE_GROUP, 'mound'));
    this.object.add(partMesh(context, back, STRUCTURE_GROUP, 'mound'), this.front);
    this.object.position.y = SEABED_Y;
  }

  setGrowth(share: number): void {
    this.object.visible = share > 0;
    this.object.scale.y = Math.max(share, MOUND.minGrowth);
  }

  setCutaway(cutaway: boolean): void {
    this.front.visible = !cutaway;
  }
}
