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
      'top',
      'close',
      'pilot',
      'side',
      'fpv',
    ]);
  });

  it('plays every chapter at normal speed', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].speed)).toEqual([1, 1, 1, 1, 1, 1]);
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.speed).toBeGreaterThanOrEqual(SPEED_RANGE.min);
      expect(preset.speed).toBeLessThanOrEqual(SPEED_RANGE.max);
    });
  });

  it('seeks each chapter to its second of the flight and never pauses', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].startAt)).toEqual([0, 5, 16, 20, 30, 52]);
    Object.values(PRESETS).forEach((preset) => expect(preset.pauseAt).toBeUndefined());
  });

  it('switches the beams, the track and the spin arrows per chapter and never the labels', () => {
    expect(PRESETS.overview.view).toEqual({ links: true, track: true });
    expect(PRESETS.flight.view).toEqual({ arrows: true });
    expect(PRESETS.controller.view).toEqual({ arrows: false });
    expect(PRESETS.link.view).toEqual({ links: true });
    expect(PRESETS.power.view).toBeUndefined();
    expect(PRESETS.limits.view).toEqual({ track: true });
    Object.values(PRESETS).forEach((preset) => expect(preset.view?.labels).toBeUndefined());
  });

  it('gives each chapter its own controls', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].controls)).toEqual([
      undefined,
      ['move', 'tilt'],
      ['flightMode'],
      ['packetRate'],
      ['payload'],
      ['speedster'],
    ]);
  });

  it('highlights nothing in the overview and the limits', () => {
    expect(PRESETS.overview.highlight).toEqual([]);
    expect(PRESETS.limits.highlight).toEqual([]);
    expect(PRESETS.overview.labels).toHaveLength(6);
  });
});
