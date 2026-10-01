import { describe, expect, it } from 'vitest';
import { PART_IDS, PRESET_IDS } from '../ids';
import { unitsAt } from '../model';
import { SPEED_RANGE } from '../timeline';
import { PRESETS } from './presets';

describe('chapter presets', () => {
  it('has the six chapters in reading order', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
  });

  it('labels and highlights only known parts', () => {
    Object.entries(PRESETS).forEach(([id, preset]) => {
      [...preset.labels, ...preset.highlight].forEach((part) =>
        expect(PART_IDS, `${id}: ${part}`).toContain(part),
      );
    });
  });

  it('frames each chapter with its own camera view', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual([
      'hero',
      'cartridge',
      'action',
      'barrel',
      'gasSystem',
      'reload',
    ]);
  });

  it('plays each chapter at the speed stop the spec asks for', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].speed)).toEqual([1, 0, 0, 0, 0, 1]);
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.speed).toBeGreaterThanOrEqual(SPEED_RANGE.min);
      expect(preset.speed).toBeLessThanOrEqual(SPEED_RANGE.max);
    });
  });

  it('pauses the cartridge chapter at the strike and seeks the others without pausing', () => {
    expect(PRESETS.cartridge.pauseAt).toBe(unitsAt(4));
    expect(PRESETS.cartridge.startAt).toBeUndefined();
    expect(PRESET_IDS.map((id) => PRESETS[id].startAt)).toEqual([
      0,
      undefined,
      0,
      unitsAt(4.2),
      unitsAt(4.8),
      unitsAt(10),
    ]);
    PRESET_IDS.filter((id) => id !== 'cartridge').forEach((id) =>
      expect(PRESETS[id].pauseAt, id).toBeUndefined(),
    );
  });

  it('opens the cutaway in every chapter but the overview and never sets the labels', () => {
    expect(PRESETS.overview.view).toEqual({ cutaway: false, gas: true, trail: true });
    PRESET_IDS.slice(1).forEach((id) => expect(PRESETS[id].view?.cutaway, id).toBe(true));
    expect(PRESETS.barrel.view).toEqual({ cutaway: true, trail: true });
    expect(PRESETS.gas.view).toEqual({ cutaway: true, gas: true });
    Object.values(PRESETS).forEach((preset) => expect(preset.view?.labels).toBeUndefined());
  });

  it('keeps the gas port in the gas chapter and the comparison in the reload chapter', () => {
    expect(PRESETS.gas.controls).toEqual(['gasPort']);
    expect(PRESETS.reload.controls).toEqual(['comparison']);
    PRESET_IDS.filter((id) => id !== 'gas' && id !== 'reload').forEach((id) =>
      expect(PRESETS[id].controls, id).toBeUndefined(),
    );
  });

  it('highlights nothing in the overview', () => {
    expect(PRESETS.overview.highlight).toEqual([]);
    expect(PRESETS.overview.labels).toHaveLength(8);
  });
});
