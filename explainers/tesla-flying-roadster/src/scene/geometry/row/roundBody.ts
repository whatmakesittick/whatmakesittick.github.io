import type { BufferGeometry } from 'three';
import type { Curve } from '../body/curve';
import { HALF_TURN, QUARTER_TURN } from '../turns';
import { mirroredBoxes } from './paint';
import { loft } from './loft';
import type { SectionPoint } from './loft';
import { bandSwatch, ruleSwatch } from './rules';
import type { PaintRule, Range } from './rules';
import {
  endStations,
  endTaper,
  mergeStations,
  roundPoint,
  spacedStations,
  upperHeightAt,
  upperWidthAt,
} from './section';
import type { EndRounding, RoundSection, Squareness } from './section';
import type { BodyPaint, SwatchUv } from './swatch';

export interface ArchSpec {
  x: number;
  radius: number;
  centreY: number;
  innerZ: number;
  samples: number;
}

export interface RoundBodySpec {
  from: number;
  to: number;
  halfWidth: number;
  squareness: Squareness;
  front: EndRounding;
  back: EndRounding;
  top: Curve;
  bottom: Curve;
  waist: Curve;
  arches: readonly ArchSpec[];
  rows: readonly number[];
  rules: readonly PaintRule<Range>[];
  exact: readonly number[];
  spacing: number;
}

export interface CabinSpec {
  stations: readonly number[];
  rows: readonly SectionPoint[];
  roof: Curve;
  plan: Curve;
  inset: number;
  rules: readonly PaintRule<readonly number[]>[];
}

export const ROUND_ROW = {
  shoulder: 0.62,
  seam: 0.84,
  seamHalf: 0.005,
  lamp: 1.14,
  sill: 1.95,
  skirt: 2.45,
  floorEdge: 2.85,
} as const;

export const ROUND_ROWS = [
  0,
  ROUND_ROW.shoulder,
  ROUND_ROW.seam - ROUND_ROW.seamHalf,
  ROUND_ROW.seam + ROUND_ROW.seamHalf,
  ROUND_ROW.lamp,
  QUARTER_TURN,
  ROUND_ROW.sill,
  ROUND_ROW.skirt,
  ROUND_ROW.floorEdge,
  HALF_TURN,
];

export const SEAM_BAND: Range = [
  ROUND_ROW.seam - ROUND_ROW.seamHalf,
  ROUND_ROW.seam + ROUND_ROW.seamHalf,
];

export const CABIN_BAND = { top: [0, 1, 2], rail: [3], frame: [4], glass: [5], belt: [6] } as const;

const HANDLE = { halfLength: 0.08, height: 0.025, proud: 0.012 } as const;

export const MINIMUM_GAP = 0.035;
const ARCH_CLEARANCE = 0.015;
const CABIN_SINK = 0.004;

function archCeiling(arch: ArchSpec, x: number): number {
  const offset = Math.abs(x - arch.x);
  if (offset > arch.radius) return -Infinity;
  return arch.centreY + Math.sqrt(arch.radius ** 2 - offset ** 2);
}

export interface LiftedPoint {
  lifted: boolean;
  point: SectionPoint;
}

export function liftUnderArches(
  arches: readonly ArchSpec[],
  x: number,
  [z, y]: SectionPoint,
): LiftedPoint {
  const ceiling = Math.max(
    -Infinity,
    ...arches.filter((arch) => z > arch.innerZ).map((arch) => archCeiling(arch, x)),
  );
  const lifted = y < ceiling;
  return { lifted, point: lifted ? [z, ceiling] : [z, y] };
}

export function archStations(arch: ArchSpec): number[] {
  const reach = arch.radius + ARCH_CLEARANCE;
  const steps = Array.from({ length: arch.samples + 1 }, (_, step) => {
    return arch.x - arch.radius * Math.cos((step / arch.samples) * HALF_TURN);
  });
  return [arch.x - reach, ...steps, arch.x + reach];
}

export function seamStations(centres: readonly number[], gap: number): number[] {
  return centres.flatMap((x) => [x - gap, x + gap]);
}

export class RoundBody {
  private readonly spec: RoundBodySpec;

  constructor(spec: RoundBodySpec) {
    this.spec = spec;
  }

  section(x: number): RoundSection {
    const { spec } = this;
    const front = x > (spec.from + spec.to) / 2;
    const distance = front ? spec.to - x : x - spec.from;
    return {
      halfWidth: spec.halfWidth * endTaper(distance, front ? spec.front : spec.back),
      top: spec.top(x),
      waist: spec.waist(x),
      bottom: spec.bottom(x),
    };
  }

  heightAt(x: number, z: number): number {
    return upperHeightAt(this.section(x), this.spec.squareness, z);
  }

  sideAt(x: number, y: number): number {
    return upperWidthAt(this.section(x), this.spec.squareness, y);
  }

  geometry(paint: BodyPaint, uv: SwatchUv): BufferGeometry {
    const { rows, rules } = this.spec;
    return loft({
      stations: this.stations(),
      ring: (x) => rows.map((theta) => this.surface(x, theta).point),
      uvAt: (x, band) => {
        const theta = (rows[band] + rows[band + 1]) / 2;
        if (this.surface(x, theta).lifted) return uv('under');
        return uv(ruleSwatch(rules, x, theta, paint));
      },
    });
  }

  cabin(cabin: CabinSpec, paint: BodyPaint, uv: SwatchUv): BufferGeometry {
    return loft({
      stations: cabin.stations,
      ring: (x) => {
        const section = this.section(x);
        const baseZ = (section.halfWidth - cabin.inset) * cabin.plan(x);
        const baseY = this.heightAt(x, baseZ) - CABIN_SINK;
        const height = Math.max(0, cabin.roof(x) - baseY);
        return cabin.rows.map(([across, up]) => [baseZ * across, baseY + height * up]);
      },
      uvAt: (x, band) => uv(bandSwatch(cabin.rules, x, band, paint)),
    });
  }

  private surface(x: number, theta: number): LiftedPoint {
    const point = roundPoint(this.section(x), this.spec.squareness, theta);
    return liftUnderArches(this.spec.arches, x, point);
  }

  private stations(): number[] {
    const { spec } = this;
    const regular = [
      ...endStations(spec.to, -1, spec.front),
      ...endStations(spec.from, 1, spec.back),
      ...spec.arches.flatMap(archStations),
      ...spacedStations(spec.from + spec.back.depth, spec.to - spec.front.depth, spec.spacing),
    ].filter((x) => x >= spec.from && x <= spec.to);
    return mergeStations(regular, spec.exact, MINIMUM_GAP);
  }
}

export function doorHandles(
  body: RoundBody,
  xs: readonly number[],
  y: number,
  uv: SwatchUv,
): BufferGeometry[] {
  return xs.flatMap((x) => {
    const side = body.sideAt(x, y);
    return mirroredBoxes(
      {
        minX: x - HANDLE.halfLength,
        maxX: x + HANDLE.halfLength,
        minY: y - HANDLE.height / 2,
        maxY: y + HANDLE.height / 2,
        minZ: side - HANDLE.proud,
        maxZ: side + HANDLE.proud / 2,
      },
      'trim',
      uv,
    );
  });
}
