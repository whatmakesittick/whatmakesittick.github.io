import { describe, expect, it } from 'vitest';
import { BULLET_SEAT_X, CARTRIDGE, CHAMBER } from '../../model/layout';
import { bulletStrands, caseOutline, powderStrands, primerStrands } from './cartridge';

function span(points: readonly (readonly [number, number])[]) {
  const xs = points.map(([x]) => x);
  const radii = points.map(([, radius]) => radius);
  return { min: Math.min(...xs), max: Math.max(...xs), radius: Math.max(...radii) };
}

describe('cartridge profiles', () => {
  it('fits the case inside the chamber from the breech to the mouth', () => {
    const outline = span(caseOutline());
    expect(outline.min).toBe(0);
    expect(outline.max).toBeCloseTo(CARTRIDGE.caseLength);
    expect(outline.radius).toBeLessThanOrEqual(CHAMBER.baseRadius);
  });

  it('makes a bullet as long as the cartridge leaves room for', () => {
    const bullet = span(bulletStrands().flat());
    expect(bullet.max).toBeCloseTo(CARTRIDGE.bulletLength);
    expect(bullet.radius).toBeCloseTo(CARTRIDGE.bulletRadius);
  });

  it('stops the powder short of the seated bullet and keeps the primer in its pocket', () => {
    expect(span(powderStrands().flat()).max).toBeLessThan(BULLET_SEAT_X);
    expect(span(primerStrands().flat()).radius).toBeLessThanOrEqual(CARTRIDGE.primerRadius);
  });
});
