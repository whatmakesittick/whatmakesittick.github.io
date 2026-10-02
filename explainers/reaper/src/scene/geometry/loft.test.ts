import { describe, expect, it } from 'vitest';
import { boundsOf } from './testing';
import { FUSELAGE, HUMP } from '../constants';
import {
  interpolateSections,
  loftGeometry,
  loftPatch,
  monotoneCubic,
  sectionCurve,
  sectionPoint,
} from './loft';

const SECTION = { x: 1, bottom: -0.5, waist: 0, top: 0.8, halfWidth: 0.4 };

describe('monotoneCubic', () => {
  it('passes through the given points and holds the ends', () => {
    const curve = monotoneCubic([0, 1, 3], [0, 2, 2.5]);
    expect(curve(0)).toBe(0);
    expect(curve(1)).toBeCloseTo(2);
    expect(curve(3)).toBeCloseTo(2.5);
    expect(curve(-1)).toBe(0);
    expect(curve(9)).toBe(2.5);
  });

  it('never overshoots a flat stretch', () => {
    const curve = monotoneCubic([0, 1, 2, 3], [0, 1, 1, 0]);
    for (let x = 0; x <= 3; x += 0.05) expect(curve(x)).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe('sectionPoint', () => {
  it('reaches the top, the bottom and both sides of a section', () => {
    const squareness = 2;
    const top = sectionPoint(SECTION, Math.PI / 2, squareness);
    const bottom = sectionPoint(SECTION, -Math.PI / 2, squareness);
    const right = sectionPoint(SECTION, 0, squareness);
    expect(top[1]).toBeCloseTo(SECTION.top);
    expect(bottom[1]).toBeCloseTo(SECTION.bottom);
    expect(right[2]).toBeCloseTo(SECTION.halfWidth);
    expect(right[1]).toBeCloseTo(SECTION.waist);
  });
});

describe('fuselage loft', () => {
  it('runs from the nose to the tail cone and stays within its sections', () => {
    const geometry = loftGeometry(FUSELAGE.sections, {
      radialSegments: FUSELAGE.radialSegments,
      samplesBetween: FUSELAGE.samplesBetween,
      squareness: FUSELAGE.squareness,
    });
    const box = boundsOf(geometry);
    const xs = FUSELAGE.sections.map((section) => section.x);
    expect(box.max.x).toBeCloseTo(Math.max(...xs));
    expect(box.min.x).toBeCloseTo(Math.min(...xs));
    expect(box.max.z).toBeCloseTo(
      Math.max(...FUSELAGE.sections.map((section) => section.halfWidth)),
      2,
    );
  });

  it('puts the hump on top of the forward fuselage', () => {
    const fuselage = sectionCurve(FUSELAGE.sections);
    const hump = sectionCurve(HUMP.sections);
    expect(hump(4).top).toBeGreaterThan(fuselage(4).top + 0.3);
    expect(hump(4).bottom).toBeGreaterThan(fuselage(4).bottom);
  });

  it('samples between the given sections in order', () => {
    const sampled = interpolateSections(FUSELAGE.sections, 3);
    expect(sampled.length).toBe((FUSELAGE.sections.length - 1) * 3 + 1);
    sampled
      .slice(1)
      .forEach((section, index) => expect(section.x).toBeGreaterThan(sampled[index].x));
  });

  it('cuts curved panels out of the skin', () => {
    const panel = loftPatch(FUSELAGE.sections, FUSELAGE.squareness, {
      x: [0, 1],
      angle: [-Math.PI / 2, -Math.PI / 3],
      samples: [4, 3],
      inflate: 0.01,
    });
    const box = boundsOf(panel);
    expect(box.max.y).toBeLessThan(0);
    expect(box.min.z).toBeGreaterThanOrEqual(-1e-6);
  });
});
