import { describe, expect, it } from 'vitest';
import {
  ANCHOR_IDS,
  CAMERA_VIEW_IDS,
  CHAPTER_ACTION_IDS,
  CUTAWAY_IDS,
  MOMENT_IDS,
  PART_IDS,
  PHASE_IDS,
  PRESET_IDS,
  REGION_IDS,
  STREAM_IDS,
  VIEW_IDS,
} from './ids';

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

describe('ids', () => {
  it('names every id once', () => {
    [
      PART_IDS,
      PHASE_IDS,
      MOMENT_IDS,
      PRESET_IDS,
      CUTAWAY_IDS,
      STREAM_IDS,
      VIEW_IDS,
      CAMERA_VIEW_IDS,
      REGION_IDS,
      ANCHOR_IDS,
      CHAPTER_ACTION_IDS,
    ].forEach((ids) => expect(unique(ids)).toBe(true));
  });

  it('has one camera view per preset', () => {
    expect(CAMERA_VIEW_IDS).toHaveLength(PRESET_IDS.length);
  });
});
