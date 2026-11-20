import { describe, expect, it } from 'vitest';
import {
  ANCHOR_IDS,
  CAMERA_VIEW_IDS,
  PACE_IDS,
  PART_IDS,
  PHASE_IDS,
  PRESET_IDS,
  REGION_IDS,
  VIEW_IDS,
} from './ids';

function distinct(values: readonly string[]): number {
  return new Set(values).size;
}

describe('ids', () => {
  it('lists every id once', () => {
    [
      PART_IDS,
      PHASE_IDS,
      PRESET_IDS,
      PACE_IDS,
      VIEW_IDS,
      CAMERA_VIEW_IDS,
      REGION_IDS,
      ANCHOR_IDS,
    ].forEach((ids) => expect(distinct(ids)).toBe(ids.length));
  });

  it('has one preset and one camera view per chapter', () => {
    expect(PRESET_IDS).toHaveLength(6);
    expect(CAMERA_VIEW_IDS).toHaveLength(6);
    expect(PART_IDS).toHaveLength(10);
  });
});
