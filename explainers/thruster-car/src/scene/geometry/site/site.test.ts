import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SITE } from '../../../model/layout';
import { THEME } from '../../../theme';
import { BUSHES, nearRun, scatterBushes } from './bushes';
import { CONE, coneGeometry } from './cone';
import { GROUND, groundGeometry, gridLines, onRun } from './groundGrid';
import { landingMarks, pitMarks, startMarks } from './markings';
import type { MarkRect } from './markings';
import { rampPit } from './pit';

function overlaps(a: MarkRect, b: MarkRect): boolean {
  return a.x[0] < b.x[1] && b.x[0] < a.x[1] && a.z[0] < b.z[1] && b.z[0] < a.z[1];
}

function expectApart(marks: readonly MarkRect[]): void {
  marks.forEach((mark, index) =>
    marks.slice(index + 1).forEach((other) => expect(overlaps(mark, other)).toBe(false)),
  );
}

describe('ground grid', () => {
  it('adds the runway edges to the regular lines', () => {
    const lines = gridLines([-30, 30], 15, [-6, 6]);
    expect(lines).toEqual([-30, -15, -6, 0, 6, 15, 30]);
  });

  it('leaves the runway footprint open and runs past the fog', () => {
    const geometry = groundGeometry();
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    if (!index) throw new Error('Ground is not indexed');
    for (let face = 0; face < index.count; face += 3) {
      const centre = new Vector3();
      for (let corner = 0; corner < 3; corner += 1) {
        centre.add(new Vector3().fromBufferAttribute(position, index.getX(face + corner)));
      }
      centre.divideScalar(3);
      expect(onRun(centre.x, centre.z)).toBe(false);
    }
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.max.x).toBeGreaterThan(GROUND.centreX + 800);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(GROUND.level, 6);
  });
});

describe('bushes', () => {
  it('scatters a few dozen bushes beyond the run, the ramp and the landing path', () => {
    const bushes = scatterBushes();
    expect(bushes.length).toBe(BUSHES.count);
    bushes.forEach((bush) => {
      expect(nearRun(bush.x, bush.z)).toBe(false);
      expect(
        Math.abs(bush.z) > SITE.run.z[1] || bush.x < SITE.run.x[0] || bush.x > SITE.run.x[1],
      ).toBe(true);
    });
  });
});

describe('traffic cone', () => {
  it('stands 70 cm tall on a square base with white bands', () => {
    const geometry = coneGeometry();
    const bounds = new Box3().setFromBufferAttribute(geometry.getAttribute('position') as never);
    expect(bounds.max.y).toBeCloseTo(CONE.height, 3);
    expect(bounds.max.x).toBeCloseTo(CONE.plate.half, 3);
    const colour = geometry.getAttribute('color');
    const whites = Array.from({ length: colour.count }, (_, index) => colour.getX(index)).filter(
      (red, index) => red > 0.7 && colour.getZ(index) > 0.7,
    );
    expect(whites.length).toBeGreaterThan(0);
    expect(THEME.cone).toBeDefined();
  });
});

describe('paint markings', () => {
  it('outlines the start box and paints a start line across the lane', () => {
    const marks = startMarks();
    expectApart(marks);
    const line = marks[marks.length - 1];
    expect(line.x[0]).toBe(SITE.startBox.x[1]);
    expect(line.z[1] - line.z[0]).toBeGreaterThan(SITE.startBox.z[1] - SITE.startBox.z[0]);
  });

  it('frames the landing box with corner marks and a centre cross', () => {
    const marks = landingMarks();
    expectApart(marks);
    const { x, z } = SITE.landingBox;
    const centre = { x: (x[0] + x[1]) / 2, z: (z[0] + z[1]) / 2 };
    expect(
      marks.some(
        (mark) =>
          mark.x[0] < centre.x &&
          mark.x[1] > centre.x &&
          mark.z[0] <= centre.z &&
          mark.z[1] >= centre.z,
      ),
    ).toBe(true);
    const outside = marks.filter(
      (mark) => mark.x[1] <= x[0] || mark.x[0] >= x[1] || mark.z[1] <= z[0] || mark.z[0] >= z[1],
    );
    expect(outside.length).toBe(8);
  });

  it('rings the pit with a safety band that stays on the runway', () => {
    const pit = rampPit();
    if (!pit) throw new Error('No pit');
    const marks = pitMarks(pit);
    expectApart(marks);
    marks.forEach((mark) => {
      expect(mark.z[0]).toBeGreaterThan(SITE.run.z[0]);
      expect(mark.z[1]).toBeLessThan(SITE.run.z[1]);
      expect(overlaps(mark, { x: pit.x, z: pit.z })).toBe(false);
    });
  });
});
