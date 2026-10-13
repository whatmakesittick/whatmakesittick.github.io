import { describe, expect, it } from 'vitest';
import {
  CAMERA_VIEW_IDS,
  CHAPTER_ACTION_IDS,
  KICKBACK_CHOICE_IDS,
  PART_IDS,
  PHASE_IDS,
  PRESET_IDS,
  PRESET_SETTINGS,
  SETTING_IDS,
  THROTTLE_CHOICE_IDS,
} from './ids';

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

describe('ids', () => {
  it('names every part, phase, preset and view once', () => {
    [PART_IDS, PHASE_IDS, PRESET_IDS, CAMERA_VIEW_IDS].forEach((ids) =>
      expect(unique(ids)).toBe(true),
    );
  });

  it('has seven chapters, each with one camera view and a setting', () => {
    expect(PRESET_IDS).toHaveLength(CAMERA_VIEW_IDS.length);
    expect(Object.keys(PRESET_SETTINGS)).toEqual([...PRESET_IDS]);
    PRESET_IDS.forEach((id) => expect(SETTING_IDS).toContain(PRESET_SETTINGS[id]));
  });

  it('shows the log while cutting in the first and fifth chapters only', () => {
    const cutting = PRESET_IDS.filter((id) => PRESET_SETTINGS[id] === 'cutting');
    expect(cutting).toEqual(['saw', 'chain']);
  });

  it('starts the saw between the fuel and clutch chapters', () => {
    expect(PRESET_IDS.indexOf('starting')).toBe(PRESET_IDS.indexOf('fuel') + 1);
    expect(PRESET_IDS).toHaveLength(7);
  });

  it('offers a single strong kickback and three throttle stops', () => {
    expect(KICKBACK_CHOICE_IDS).toEqual(['strong']);
    expect(THROTTLE_CHOICE_IDS).toEqual(['idle', 'half', 'full']);
    expect(CHAPTER_ACTION_IDS).toEqual(['throttle', 'brake', 'kickback', 'start']);
  });
});
