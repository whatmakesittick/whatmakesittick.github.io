import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { HORIZON_TIME, tauAtRadius } from '../model';
import { SPEED_RANGE } from '../timeline';
import { PRESETS } from './presets';
import type { PresetId } from './presets';

const PRESET_ORDER: PresetId[] = ['overview', 'clocks', 'light', 'frozen', 'inside', 'others'];

describe('chapter presets', () => {
  it('has the six chapters in reading order', () => {
    expect(Object.keys(PRESETS)).toEqual(PRESET_ORDER);
  });

  it('labels and highlights only known parts', () => {
    Object.entries(PRESETS).forEach(([id, preset]) => {
      [...preset.labels, ...preset.highlight].forEach((part) =>
        expect(PART_IDS, `${id}: ${part}`).toContain(part),
      );
    });
  });

  it('frames each chapter with its own camera view', () => {
    expect(PRESET_ORDER.map((id) => PRESETS[id].camera)).toEqual([
      'hero',
      'probe',
      'lens',
      'ship',
      'probe',
      'sheet',
    ]);
  });

  it('plays each chapter at the speed stop the spec asks for', () => {
    expect(PRESET_ORDER.map((id) => PRESETS[id].speed)).toEqual([3, 3, 3, 1, 0, 3]);
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.speed).toBeGreaterThanOrEqual(SPEED_RANGE.min);
      expect(preset.speed).toBeLessThanOrEqual(SPEED_RANGE.max);
    });
  });

  it('seeks each chapter to its moment without pausing', () => {
    expect(PRESET_ORDER.map((id) => PRESETS[id].startAt)).toEqual([
      0,
      0,
      tauAtRadius(3),
      tauAtRadius(2),
      HORIZON_TIME - 8,
      0,
    ]);
    Object.values(PRESETS).forEach((preset) => expect(preset.pauseAt).toBeUndefined());
  });

  it('shows the disc everywhere but the rubber sheet chapter', () => {
    PRESET_ORDER.slice(0, -1).forEach((id) =>
      expect(PRESETS[id].view, id).toEqual({ disc: true, sheet: false }),
    );
    expect(PRESETS.others.view).toEqual({ disc: false, sheet: true });
    Object.values(PRESETS).forEach((preset) => expect(preset.view?.labels).toBeUndefined());
  });

  it('keeps the comparison only in the last chapter', () => {
    expect(PRESETS.others.controls).toEqual(['comparison']);
    PRESET_ORDER.slice(0, -1).forEach((id) => expect(PRESETS[id].controls, id).toBeUndefined());
  });
});
