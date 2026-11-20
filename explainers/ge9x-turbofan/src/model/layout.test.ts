import { describe, expect, it } from 'vitest';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import { ANCHOR_POINTS, PART_SPANS, REGION_BOUNDS, partAnchorPoint } from './layout';

describe('layout', () => {
  it('spans every part but the person inside the engine', () => {
    PART_IDS.filter((id) => id !== 'person').forEach((id) => {
      const span = PART_SPANS[id as keyof typeof PART_SPANS];
      expect(span.from).toBeGreaterThanOrEqual(0);
      expect(span.to).toBeLessThanOrEqual(1);
      expect(span.from).toBeLessThan(span.to);
    });
  });

  it('places every part, anchor and region', () => {
    PART_IDS.forEach((id) => expect(partAnchorPoint(id)).toHaveLength(3));
    ANCHOR_IDS.forEach((id) => expect(ANCHOR_POINTS[id]).toHaveLength(3));
    REGION_IDS.forEach((id) => {
      const { min, max } = REGION_BOUNDS[id];
      [0, 1, 2].forEach((axis) => expect(min[axis]).toBeLessThan(max[axis]));
    });
  });
});
