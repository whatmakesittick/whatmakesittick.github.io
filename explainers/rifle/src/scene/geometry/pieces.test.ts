import { describe, expect, it } from 'vitest';
import { boxPiece, turnedPiece } from './pieces';
import { zRange } from './testing';

describe('cut pieces', () => {
  it('keeps a piece on the left of the cut as it is', () => {
    expect(boxPiece({ x: [0, 1], y: [0, 1], z: [-3, -1] }).kind).toBe('kept');
  });

  it('drops a piece on the right of the cut', () => {
    expect(boxPiece({ x: [0, 1], y: [0, 1], z: [1, 3] }).kind).toBe('removed');
  });

  it('splits a piece across the cut into a whole, a half and a cut face', () => {
    const cutPiece = boxPiece({ x: [0, 1], y: [0, 1], z: [-1, 1] });
    expect(cutPiece.kind).toBe('split');
    if (cutPiece.kind !== 'split') return;
    expect(zRange(cutPiece.half)[1]).toBeLessThanOrEqual(0);
    expect(cutPiece.face).not.toBeNull();
  });

  it('lifts a turned piece onto its axis', () => {
    const turned = turnedPiece({
      strands: [
        [
          [0, 2],
          [5, 2],
        ],
      ],
      segments: 16,
      axisY: 10,
    });
    turned.whole.computeBoundingBox();
    expect(turned.whole.boundingBox?.min.y).toBeCloseTo(8);
    expect(turned.whole.boundingBox?.max.y).toBeCloseTo(12);
  });
});
