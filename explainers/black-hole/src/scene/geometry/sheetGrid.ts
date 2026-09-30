import { Color } from 'three';
import { HORIZON_RADIUS } from '../../model';
import { THEME } from '../../theme';
import { SHEET_LOOK } from '../constants';
import { SHEET, sheetDepth } from '../layout';

const XYZ = 3;
const FULL_TURN = Math.PI * 2;
const POINTS_PER_SEGMENT = 2;

export interface SheetGrid {
  positions: Float32Array;
  colors: Float32Array;
}

export function sheetRadii(rings = SHEET.rings, rim = SHEET.rim): number[] {
  return Array.from({ length: rings + 1 }, (_, index) => {
    const share = index / rings;
    return HORIZON_RADIUS + (rim - HORIZON_RADIUS) * share * share;
  });
}

export function sheetPoint(radius: number, azimuth: number): [number, number, number] {
  return [radius * Math.cos(azimuth), -sheetDepth(radius), radius * Math.sin(azimuth)];
}

export function throatGlow(radius: number): number {
  return Math.exp(-(radius - HORIZON_RADIUS) / SHEET_LOOK.glowReach);
}

class SegmentWriter {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  private readonly base = new Color(THEME.sheet);
  private readonly glow = new Color(THEME.sheetGlow);
  private readonly mixed = new Color();
  private cursor = 0;

  constructor(segments: number) {
    this.positions = new Float32Array(segments * POINTS_PER_SEGMENT * XYZ);
    this.colors = new Float32Array(segments * POINTS_PER_SEGMENT * XYZ);
  }

  segment(from: readonly [number, number, number], to: readonly [number, number, number]): void {
    this.point(from);
    this.point(to);
  }

  private point([x, y, z]: readonly [number, number, number]): void {
    const radius = Math.hypot(x, z);
    this.mixed.lerpColors(this.base, this.glow, throatGlow(radius));
    const offset = this.cursor * XYZ;
    this.positions.set([x, y, z], offset);
    this.colors.set([this.mixed.r, this.mixed.g, this.mixed.b], offset);
    this.cursor += 1;
  }
}

export function buildSheetGrid(
  segments: number = SHEET.segments,
  spokes: number = SHEET_LOOK.spokes,
  radii: readonly number[] = sheetRadii(),
): SheetGrid {
  const ringSegments = radii.length * segments;
  const spokeSegments = spokes * (radii.length - 1);
  const writer = new SegmentWriter(ringSegments + spokeSegments);
  for (const radius of radii) {
    for (let step = 0; step < segments; step += 1) {
      const from = (step / segments) * FULL_TURN;
      const to = ((step + 1) / segments) * FULL_TURN;
      writer.segment(sheetPoint(radius, from), sheetPoint(radius, to));
    }
  }
  for (let spoke = 0; spoke < spokes; spoke += 1) {
    const azimuth = (spoke / spokes) * FULL_TURN;
    for (let ring = 0; ring + 1 < radii.length; ring += 1) {
      writer.segment(sheetPoint(radii[ring], azimuth), sheetPoint(radii[ring + 1], azimuth));
    }
  }
  return { positions: writer.positions, colors: writer.colors };
}
