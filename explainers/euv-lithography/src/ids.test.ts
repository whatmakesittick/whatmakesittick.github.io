import { describe, expect, it } from 'vitest';
import {
  ANCHOR_IDS,
  CAMERA_VIEW_IDS,
  CHAPTER_ACTION_IDS,
  DOCK_VIEW_IDS,
  LABEL_PRIORITY,
  LEFT_LABEL_PARTS,
  MACHINE_IDS,
  MOMENT_IDS,
  OPTICS_IDS,
  PART_IDS,
  PHASE_IDS,
  PLACE_IDS,
  PRESET_IDS,
  REGION_IDS,
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
      MACHINE_IDS,
      OPTICS_IDS,
      PLACE_IDS,
      VIEW_IDS,
      CAMERA_VIEW_IDS,
      ANCHOR_IDS,
      REGION_IDS,
    ].forEach((ids) => expect(unique(ids)).toBe(true));
  });

  it('offers one machine choice of three, with the 3600D first', () => {
    expect(MACHINE_IDS).toEqual(['nxe3600d', 'nxe3800e', 'exe5000']);
    expect(CHAPTER_ACTION_IDS).toEqual(['moment', 'bounce', 'machine']);
  });

  it('ranks every part once, flash first', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY[0]).toBe('flash');
    expect(LABEL_PRIORITY.slice(0, 4)).toEqual(['flash', 'plasma', 'dropletInset', 'patternInset']);
  });

  it('puts only known parts on the left', () => {
    LEFT_LABEL_PARTS.forEach((id) => expect(PART_IDS).toContain(id));
    expect(unique(LEFT_LABEL_PARTS)).toBe(true);
  });

  it('gives each chapter a fixed camera view and keeps one chase view', () => {
    expect(CAMERA_VIEW_IDS.filter((id) => id !== 'chase')).toHaveLength(PRESET_IDS.length);
    expect(CAMERA_VIEW_IDS).toContain('chase');
    expect(REGION_IDS).toHaveLength(PRESET_IDS.length);
  });

  it('has six phases, six moments and no hidden view flag', () => {
    expect(PHASE_IDS).toHaveLength(6);
    expect(MOMENT_IDS).toHaveLength(6);
    expect(VIEW_IDS).toEqual(DOCK_VIEW_IDS);
  });
});
