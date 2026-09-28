import { describe, expect, it } from 'vitest';
import {
  TONE,
  createField,
  edgeField,
  faceField,
  normalPixels,
  paintDome,
  tonePixels,
} from './lipidField';
import type { Field } from './lipidField';
import { seededRandom } from './random';

const SIZE = 64;
const FACE = { size: SIZE, headsPerSide: 4, radiusShare: 0.47, jitterShare: 0.1 };
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
    const field = createField(SIZE, SIZE, TONE.gap);
    paintDome(field, { x: 1, y: SIZE / 2, radius: 6, tone: TONE.head }, true);
    expect(field.heights[(SIZE / 2) * SIZE + SIZE - 2]).toBeGreaterThan(0);
  });

  it('packs the face with round heads over a darker gap', () => {
    const field = faceField(FACE, seededRandom(1));
    const raised = field.heights.filter((height) => height > 0).length;
    expect(raised / field.heights.length).toBeGreaterThan(0.5);
    expect(Math.max(...field.tones)).toBeGreaterThan(TONE.gap);
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
    const pixels = normalPixels(createField(4, 4, TONE.gap), 2);
    expect([...pixels.slice(0, 4)]).toEqual([128, 128, 255, 255]);
  });

  it('writes the tone as opaque grey', () => {
    const pixels = tonePixels(createField(2, 2, 0.5));
    expect([...pixels.slice(0, 4)]).toEqual([128, 128, 128, 255]);
  });
});
