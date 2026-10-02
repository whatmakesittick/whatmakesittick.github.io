import { describe, expect, it } from 'vitest';
import { PART_IDS, PRESET_IDS } from '../ids';
import { SPEED_RANGE } from '../timeline';
import { PRESETS } from './presets';

describe('chapter presets', () => {
  it('has the six chapters in reading order', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
  });

  it('labels and highlights only known parts, and highlights only labelled ones', () => {
    Object.entries(PRESETS).forEach(([id, preset]) => {
      [...preset.labels, ...preset.highlight].forEach((part) =>
        expect(PART_IDS, `${id}: ${part}`).toContain(part),
      );
      preset.highlight.forEach((part) => expect(preset.labels, `${id}: ${part}`).toContain(part));
    });
  });

  it('frames each chapter with its own camera view', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual([
      'chase',
      'side',
      'wide',
      'nose',
      'strike',
      'orbit',
    ]);
  });

  it('plays every chapter at normal speed but the endurance one at twice', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].speed)).toEqual([1, 1, 1, 1, 1, 2]);
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.speed).toBeGreaterThanOrEqual(SPEED_RANGE.min);
      expect(preset.speed).toBeLessThanOrEqual(SPEED_RANGE.max);
    });
  });

  it('seeks each chapter to its moment and never pauses', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].startAt)).toEqual([0, 12, 23, 44, 61.5, 46]);
    Object.values(PRESETS).forEach((preset) => expect(preset.pauseAt).toBeUndefined());
  });

  it('opens the cutaway for the wing and the link and never sets the labels', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].view?.cutaway)).toEqual([
      false,
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(PRESETS.overview.view).toEqual({ cutaway: false, links: true, track: true });
    expect(PRESETS.link.view).toEqual({ cutaway: true, links: true });
    expect(PRESETS.endurance.view).toEqual({ cutaway: false, track: true });
    Object.values(PRESETS).forEach((preset) => expect(preset.view?.labels).toBeUndefined());
  });

  it('keeps one chapter control in each chapter that has one', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].controls)).toEqual([
      undefined,
      ['comparison'],
      undefined,
      ['sensorMode'],
      ['targetRange'],
      ['areaDistance'],
    ]);
  });

  it('arms the aircraft only for the strike', () => {
    expect(PRESET_IDS.filter((id) => PRESETS[id].load)).toEqual(['strike']);
    expect(PRESETS.strike.load).toBe('armed');
  });

  it('highlights nothing in the overview', () => {
    expect(PRESETS.overview.highlight).toEqual([]);
    expect(PRESETS.overview.labels).toHaveLength(8);
  });
});
