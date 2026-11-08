import { describe, expect, it } from 'vitest';
import {
  ANCHOR_IDS,
  CAMERA_VIEW_IDS,
  CHAPTER_ACTION_IDS,
  COMPARE_IDS,
  DAMPER_STATE_IDS,
  DOCK_VIEW_IDS,
  LABEL_PRIORITY,
  LEFT_LABEL_PARTS,
  MOMENT_IDS,
  PART_IDS,
  PEDAL_IDS,
  PHASE_IDS,
  PRESET_IDS,
  REGION_IDS,
  REGISTER_IDS,
  SOUND_OPTION_IDS,
  TOUCH_IDS,
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
      CHAPTER_ACTION_IDS,
      TOUCH_IDS,
      PEDAL_IDS,
      REGISTER_IDS,
      COMPARE_IDS,
      DAMPER_STATE_IDS,
      SOUND_OPTION_IDS,
      VIEW_IDS,
      CAMERA_VIEW_IDS,
      ANCHOR_IDS,
      REGION_IDS,
    ].forEach((ids) => expect(unique(ids)).toBe(true));
  });

  it('ranks every part for labels exactly once', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
  });

  it('puts only known parts on the left', () => {
    LEFT_LABEL_PARTS.forEach((id) => expect(PART_IDS).toContain(id));
    expect(unique(LEFT_LABEL_PARTS)).toBe(true);
  });

  it('gives each chapter its own camera view and region', () => {
    expect(PRESET_IDS).toHaveLength(CAMERA_VIEW_IDS.length);
    expect(REGION_IDS).toHaveLength(CAMERA_VIEW_IDS.length);
  });

  it('keeps the dock toggles a subset of the view flags', () => {
    DOCK_VIEW_IDS.forEach((id) => expect(VIEW_IDS).toContain(id));
    expect(VIEW_IDS).toContain('cutaway');
    expect(VIEW_IDS).toContain('lineUp');
  });

  it('has five steps, six moments and three choices of each kind', () => {
    expect(PHASE_IDS).toHaveLength(5);
    expect(MOMENT_IDS).toHaveLength(6);
    [TOUCH_IDS, PEDAL_IDS, REGISTER_IDS, COMPARE_IDS].forEach((ids) => expect(ids).toHaveLength(3));
  });
});
