import { describe, expect, it } from 'vitest';
import {
  ANCHOR_IDS,
  ARMS_IDS,
  CAMERA_VIEW_IDS,
  CHAPTER_ACTION_IDS,
  GROUP_IDS,
  LOOK_IDS,
  MOMENT_IDS,
  PACE_IDS,
  PART_GROUPS,
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
      GROUP_IDS,
      PHASE_IDS,
      MOMENT_IDS,
      PRESET_IDS,
      PACE_IDS,
      ARMS_IDS,
      LOOK_IDS,
      CHAPTER_ACTION_IDS,
      VIEW_IDS,
      CAMERA_VIEW_IDS,
      REGION_IDS,
      ANCHOR_IDS,
    ].forEach((ids) => expect(distinct(ids)).toBe(ids.length));
  });

  it('has the sizes the spec states', () => {
    expect(PART_IDS).toHaveLength(15);
    expect(PRESET_IDS).toHaveLength(6);
    expect(CAMERA_VIEW_IDS).toHaveLength(7);
    expect(PHASE_IDS).toHaveLength(4);
  });

  it('maps every part to existing groups', () => {
    PART_IDS.forEach((part) => {
      expect(PART_GROUPS[part].length).toBeGreaterThan(0);
      PART_GROUPS[part].forEach((group) => expect(GROUP_IDS).toContain(group));
    });
  });
});
