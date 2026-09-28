import { describe, expect, it } from 'vitest';
import {
  TONE,
  createField,
  edgeField,
  faceField,
  grey,
  headTint,
  normalPixels,
  paintDome,
  tintPixels,
} from './lipidField';
import type { Field } from './lipidField';
import { seededRandom } from './random';

const SIZE = 64;
const FACE = {
  size: SIZE,
  headsPerSide: 4,
  radiusShare: 0.47,
  radiusVariation: 0.08,
  jitterShare: 0.1,
};
const EDGE = {
  size: SIZE,
  headsPerTile: 4,
  thicknessNm: 4.5,
  coreNm: 1.35,
  radiusShare: 0.47,
  jitterShare: 0.05,
  tailOffsetNm: 0.14,
  tailWidthNm: 0.07,
  tailWaveNm: 0.07,
  tailWaveLengthNm: 0.55,
  tailGapNm: 0.12,
};

function rowHeight(field: Field, row: number): number {
  let highest = 0;
  for (let column = 0; column < field.width; column += 1) {
    highest = Math.max(highest, field.heights[row * field.width + column]);
  }
  return highest;
}

describe('lipid field', () => {
  it('wraps a head that crosses the tile edge onto the other side', () => {
    const field = createField(SIZE, SIZE, grey(TONE.gap));
    paintDome(field, { x: 1, y: SIZE / 2, radius: 6, tint: grey(TONE.head) }, true);
    expect(field.heights[(SIZE / 2) * SIZE + SIZE - 2]).toBeGreaterThan(0);
  });

  it('packs the face with round heads over a darker gap', () => {
    const field = faceField(FACE, seededRandom(1));
    const raised = field.heights.filter((height) => height > 0).length;
    expect(raised / field.heights.length).toBeGreaterThan(0.5);
    expect(Math.max(...field.tints)).toBeGreaterThan(TONE.gap);
  });

  it('shows two leaflets of heads with tails between them on the cut edge', () => {
    const field = edgeField(EDGE, seededRandom(2));
    const quarter = SIZE / 8;
    expect(rowHeight(field, quarter)).toBeGreaterThan(0.9);
    expect(rowHeight(field, SIZE - quarter)).toBeGreaterThan(0.9);
    expect(rowHeight(field, SIZE / 2)).toBe(0);
    expect(rowHeight(field, SIZE / 2 - quarter * 2)).toBeCloseTo(TONE.tailLift, 1);
  });

  it('points the normal straight out where the surface is flat', () => {
    const pixels = normalPixels(createField(4, 4, grey(TONE.gap)), 2);
    expect([...pixels.slice(0, 4)]).toEqual([128, 128, 255, 255]);
  });

  it('writes the tint as opaque colour', () => {
    const pixels = tintPixels(createField(2, 2, [1, 0.5, 0]));
    expect([...pixels.slice(0, 4)]).toEqual([255, 128, 0, 255]);
  });

  it('varies the heads a little in brightness and warmth', () => {
    const random = seededRandom(5);
    const tints = Array.from({ length: 50 }, () => headTint(random));
    const reds = tints.map(([red]) => red);
    expect(Math.max(...reds) - Math.min(...reds)).toBeGreaterThan(0.05);
    tints.forEach(([red, green, blue]) => {
      expect(Math.abs(red - blue)).toBeLessThan(TONE.warmth * 2 + 0.01);
      expect(green).toBeGreaterThan(TONE.head - TONE.headVariation - 0.01);
    });
  });
});
