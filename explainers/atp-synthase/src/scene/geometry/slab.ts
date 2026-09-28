import { BoxGeometry } from 'three';
import type { BufferGeometry } from 'three';
import type { Span } from '../../model/scale';
import { spanLength, spanMiddle } from '../../model/scale';

export interface SlabForm {
  readonly x: Span;
  readonly y: Span;
  readonly z: Span;
  readonly faceTile: number;
}

export const SLAB_SURFACES = ['edge', 'face'] as const;

export type SlabSurface = (typeof SLAB_SURFACES)[number];

const BOX_SIDES: readonly SlabSurface[] = ['edge', 'edge', 'face', 'face', 'edge', 'edge'];

const FACING = 0.5;

export function slabGeometry(form: SlabForm): BufferGeometry {
  const geometry = new BoxGeometry(spanLength(form.x), spanLength(form.y), spanLength(form.z));
  geometry.translate(spanMiddle(form.x), spanMiddle(form.y), spanMiddle(form.z));
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  const thickness = spanLength(form.y);
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const x = position.getX(vertex);
    const z = position.getZ(vertex);
    const across = (position.getY(vertex) - form.y[0]) / thickness;
    if (Math.abs(normal.getY(vertex)) > FACING) {
      uv.setXY(vertex, x / form.faceTile, z / form.faceTile);
    } else if (Math.abs(normal.getX(vertex)) > FACING) {
      uv.setXY(vertex, z / thickness, across);
    } else {
      uv.setXY(vertex, x / thickness, across);
    }
  }
  return groupBySurface(geometry);
}

function groupBySurface(geometry: BufferGeometry): BufferGeometry {
  const index = geometry.index;
  if (!index) return geometry;
  const sides = geometry.groups.map((group, side) => ({ ...group, surface: BOX_SIDES[side] }));
  const order: number[] = [];
  geometry.clearGroups();
  SLAB_SURFACES.forEach((surface, materialIndex) => {
    const start = order.length;
    sides
      .filter((side) => side.surface === surface)
      .forEach((side) => {
        for (let item = side.start; item < side.start + side.count; item += 1) {
          order.push(index.getX(item));
        }
      });
    geometry.addGroup(start, order.length - start, materialIndex);
  });
  geometry.setIndex(order);
  return geometry;
}
