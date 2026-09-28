import type { BufferGeometry } from 'three';
import type { Vec2 } from './outline';
import { extrudeOutline } from './extrude';
import { merge } from './merge';
import { disc } from './solids';

export interface ScrewForm {
  readonly radius: number;
  readonly height: number;
  readonly dome: number;
  readonly slotWidth: number;
  readonly slotDepth: number;
}

const HALF_SEGMENTS = 12;

function halfHead(radius: number, gap: number, side: number): Vec2[] {
  const limit = Math.acos(Math.min(1, gap / radius));
  const arc = Array.from({ length: HALF_SEGMENTS + 1 }, (_, index) => {
    const angle = -limit + (2 * limit * index) / HALF_SEGMENTS;
    return { x: side * radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
  return side > 0 ? arc : [...arc].reverse();
}

export function slottedHead(form: ScrewForm, segments: number): BufferGeometry {
  const split = form.height - form.slotDepth;
  const gap = form.slotWidth / 2;
  const bevel = { size: form.dome, segments: 2 };
  return merge([
    disc({ x: 0, y: 0, r: form.radius }, [0, split], segments),
    extrudeOutline(halfHead(form.radius, gap, 1), split - form.dome, form.height, [], bevel),
    extrudeOutline(halfHead(form.radius, gap, -1), split - form.dome, form.height, [], bevel),
  ]);
}
