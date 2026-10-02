import type { BufferGeometry } from 'three';
import { FULL_TURN } from '@core/math';
import { stitchRings } from './rings';
import type { Ring, RingPoint } from './rings';

export interface LoftSection {
  x: number;
  bottom: number;
  waist: number;
  top: number;
  halfWidth: number;
}

export interface LoftOptions {
  radialSegments: number;
  samplesBetween: number;
  squareness: number;
  capStart?: boolean;
  capEnd?: boolean;
}

type Field = Exclude<keyof LoftSection, 'x'>;

const FIELDS: readonly Field[] = ['bottom', 'waist', 'top', 'halfWidth'];
const QUARTER_TURN = FULL_TURN / 4;
const MONOTONE_LIMIT = 3;

function slopes(xs: readonly number[], ys: readonly number[]): number[] {
  const secants = xs.slice(1).map((x, index) => (ys[index + 1] - ys[index]) / (x - xs[index]));
  const tangents = xs.map((_, index) => {
    if (index === 0) return secants[0];
    if (index === xs.length - 1) return secants[secants.length - 1];
    const before = secants[index - 1];
    const after = secants[index];
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  secants.forEach((secant, index) => {
    if (secant === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      return;
    }
    const a = tangents[index] / secant;
    const b = tangents[index + 1] / secant;
    const length = Math.hypot(a, b);
    if (length > MONOTONE_LIMIT) {
      const scale = MONOTONE_LIMIT / length;
      tangents[index] = scale * a * secant;
      tangents[index + 1] = scale * b * secant;
    }
  });
  return tangents;
}

export function monotoneCubic(xs: readonly number[], ys: readonly number[]): (x: number) => number {
  const tangents = slopes(xs, ys);
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    const index = xs.findIndex((value, at) => x >= value && x <= xs[at + 1]);
    const width = xs[index + 1] - xs[index];
    const t = (x - xs[index]) / width;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[index] +
      (t3 - 2 * t2 + t) * width * tangents[index] +
      (-2 * t3 + 3 * t2) * ys[index + 1] +
      (t3 - t2) * width * tangents[index + 1]
    );
  };
}

function signedPower(value: number, exponent: number): number {
  return Math.sign(value) * Math.abs(value) ** exponent;
}

export function sectionPoint(section: LoftSection, angle: number, squareness: number): RingPoint {
  const exponent = 2 / squareness;
  const across = signedPower(Math.cos(angle), exponent);
  const up = signedPower(Math.sin(angle), exponent);
  const reach = up >= 0 ? section.top - section.waist : section.waist - section.bottom;
  return [section.x, section.waist + reach * up, section.halfWidth * across];
}

function sampleXs(sections: readonly LoftSection[], between: number): number[] {
  const xs = [sections[0].x];
  for (let index = 1; index < sections.length; index += 1) {
    const from = sections[index - 1].x;
    const to = sections[index].x;
    for (let step = 1; step <= between; step += 1) xs.push(from + ((to - from) * step) / between);
  }
  return xs;
}

export function sectionCurve(sections: readonly LoftSection[]): (x: number) => LoftSection {
  const sorted = [...sections].sort((a, b) => a.x - b.x);
  const xs = sorted.map((section) => section.x);
  const curves = Object.fromEntries(
    FIELDS.map((field) => [
      field,
      monotoneCubic(
        xs,
        sorted.map((section) => section[field]),
      ),
    ]),
  ) as Record<Field, (x: number) => number>;
  return (x) => ({
    x,
    bottom: curves.bottom(x),
    waist: curves.waist(x),
    top: curves.top(x),
    halfWidth: curves.halfWidth(x),
  });
}

export function interpolateSections(
  sections: readonly LoftSection[],
  between: number,
): LoftSection[] {
  const sorted = [...sections].sort((a, b) => a.x - b.x);
  return sampleXs(sorted, between).map(sectionCurve(sorted));
}

export interface LoftPatch {
  x: readonly [from: number, to: number];
  angle: readonly [from: number, to: number];
  samples: readonly [along: number, around: number];
  inflate: number;
}

function inflated(section: LoftSection, by: number): LoftSection {
  return {
    ...section,
    bottom: section.bottom - by,
    top: section.top + by,
    halfWidth: section.halfWidth + by,
  };
}

function spread(range: readonly [number, number], steps: number): number[] {
  return Array.from(
    { length: steps + 1 },
    (_, index) => range[0] + ((range[1] - range[0]) * index) / steps,
  );
}

export function loftPatch(
  sections: readonly LoftSection[],
  squareness: number,
  patch: LoftPatch,
): BufferGeometry {
  const curve = sectionCurve(sections);
  const angles = spread(patch.angle, patch.samples[1]);
  const rings = spread(patch.x, patch.samples[0]).map((x): Ring => {
    const section = inflated(curve(x), patch.inflate);
    return angles.map((angle) => sectionPoint(section, angle, squareness));
  });
  return stitchRings(rings, { open: true });
}

export function loftGeometry(
  sections: readonly LoftSection[],
  options: LoftOptions,
): BufferGeometry {
  const { radialSegments, samplesBetween, squareness } = options;
  const sampled = interpolateSections(sections, samplesBetween);
  const start = sampled[0].x;
  const length = sampled[sampled.length - 1].x - start;
  const along = sampled.map((section) => (section.x - start) / length);
  const rings = sampled.map((section): Ring =>
    Array.from({ length: radialSegments }, (_, index) =>
      sectionPoint(section, -QUARTER_TURN + (index / radialSegments) * FULL_TURN, squareness),
    ),
  );
  return stitchRings(rings, { capStart: options.capStart, capEnd: options.capEnd, along });
}
