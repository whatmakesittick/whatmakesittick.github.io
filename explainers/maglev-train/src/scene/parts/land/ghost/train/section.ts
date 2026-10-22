import { clamp, lerp, smoothstep } from '@core/math';

export type SectionPoint = readonly [z: number, y: number];

export interface BodySection {
  readonly halfWidth: number;
  readonly top: number;
  readonly bottom: number;
  readonly waist: number;
  readonly upper: number;
  readonly lower: number;
}

export interface Curve {
  readonly power: number;
  readonly round: number;
}

export interface NoseShape {
  readonly length: number;
  readonly tipY: number;
  readonly frontBottom: number;
  readonly skirtBlend: number;
  readonly width: Curve;
  readonly top: Curve;
  readonly bottom: Curve;
  readonly tipUpper: number;
  readonly tipLower: number;
}

export interface EndShape {
  readonly depth: number;
  readonly narrowing: number;
  readonly roofDrop: number;
  readonly skirtRise: number;
  readonly exponent: number;
}

const QUARTER_TURN = Math.PI / 2;

function signedPower(value: number, exponent: number): number {
  return Math.sign(value) * Math.abs(value) ** exponent;
}

export function blend(share: number, curve: Curve): number {
  const along = clamp(share, 0, 1);
  return (1 - (1 - along) ** curve.power) ** (1 / curve.round);
}

export function rise(share: number, exponent: number): number {
  return blend(share, { power: exponent, round: exponent });
}

export function sectionPoint(section: BodySection, theta: number): SectionPoint {
  const upper = theta <= QUARTER_TURN;
  const exponent = 2 / (upper ? section.upper : section.lower);
  const height = upper ? section.top - section.waist : section.waist - section.bottom;
  return [
    section.halfWidth * Math.abs(Math.sin(theta)) ** exponent,
    section.waist + height * signedPower(Math.cos(theta), exponent),
  ];
}

export function halfRing(section: BodySection, count: number): SectionPoint[] {
  return Array.from({ length: count }, (_, index) =>
    sectionPoint(section, (Math.PI * index) / (count - 1)),
  );
}

function superellipse(share: number, exponent: number): number {
  return (1 - clamp(share, 0, 1) ** exponent) ** (1 / exponent);
}

export function halfWidthAt(section: BodySection, y: number): number {
  const upper = y >= section.waist;
  const height = upper ? section.top - section.waist : section.waist - section.bottom;
  const exponent = upper ? section.upper : section.lower;
  return section.halfWidth * superellipse(Math.abs(y - section.waist) / height, exponent);
}

export function roofHeightAt(section: BodySection, z: number): number {
  const height = section.top - section.waist;
  return section.waist + height * superellipse(Math.abs(z) / section.halfWidth, section.upper);
}

export function noseSection(distance: number, nose: NoseShape, body: BodySection): BodySection {
  const along = clamp(distance / nose.length, 0, 1);
  const top = lerp(nose.tipY, body.top, blend(along, nose.top));
  const skirt = lerp(nose.frontBottom, body.bottom, smoothstep(along, nose.skirtBlend, 1));
  const bottom = lerp(nose.tipY, skirt, blend(along, nose.bottom));
  const waistShare = (body.waist - body.bottom) / (body.top - body.bottom);
  return {
    halfWidth: body.halfWidth * blend(along, nose.width),
    top,
    bottom,
    waist: lerp(bottom, top, waistShare),
    upper: lerp(nose.tipUpper, body.upper, along),
    lower: lerp(nose.tipLower, body.lower, along),
  };
}

export function endSection(distance: number, end: EndShape, body: BodySection): BodySection {
  const shrink = 1 - rise(distance / end.depth, end.exponent);
  return {
    ...body,
    halfWidth: body.halfWidth - end.narrowing * shrink,
    top: body.top - end.roofDrop * shrink,
    bottom: body.bottom + end.skirtRise * shrink,
  };
}

export function biasedDistances(length: number, count: number, bias: number): number[] {
  return Array.from({ length: count + 1 }, (_, index) => length * (index / count) ** bias);
}
