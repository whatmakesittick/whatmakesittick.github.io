import { describe, expect, it } from 'vitest';
import { PART_IDS, PRESET_IDS } from '../ids';
import { HELD_PHASE, SPEED_RANGE } from '../model';
import { PRESETS } from './presets';

describe('chapter presets', () => {
  it('has the six chapters in reading order', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
  });

  it('frames each chapter with its own camera view', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual([
      'chase',
      'waterline',
      'stern',
      'sky',
      'eye',
      'group',
    ]);
  });

  it('labels and highlights only known parts', () => {
    Object.entries(PRESETS).forEach(([id, preset]) =>
      [...preset.labels, ...preset.highlight].forEach((part) =>
        expect(PART_IDS, `${id}: ${part}`).toContain(part),
      ),
    );
  });

  it('highlights the labelled parts of the hull, jet and link chapters', () => {
    expect(PRESETS.hull.highlight).toEqual(PRESETS.hull.labels);
    expect(PRESETS.link.highlight).toEqual([
      'starlinkPanels',
      'backupPanel',
      ...PRESETS.link.labels,
    ]);
    expect(PRESETS.jet.highlight).toEqual([...PRESETS.jet.labels, 'duct', 'jetStream', 'waterjet']);
    expect(PRESETS.horizon.highlight).toEqual(['cameraDome', 'bowCamera', 'ship', 'shipRadar']);
    expect(PRESETS.overview.highlight).toEqual([]);
    expect(PRESETS.fleet.highlight).toEqual([]);
  });

  it('plays every chapter at normal speed', () => {
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.speed).toBe(1);
      expect(preset.speed).toBeGreaterThanOrEqual(SPEED_RANGE.min);
    });
  });

  it('holds the boat on the final leg for the hull and the jet, and seeks the others', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].pauseAt)).toEqual([
      undefined,
      HELD_PHASE,
      HELD_PHASE,
      undefined,
      undefined,
      undefined,
    ]);
    expect(PRESET_IDS.map((id) => PRESETS[id].startAt)).toEqual([
      0,
      undefined,
      undefined,
      52,
      62,
      96,
    ]);
  });

  it('sets the cutaway, the water flow and the links for each chapter, never the labels', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].view)).toEqual([
      { cutaway: false, flow: false, links: false },
      { cutaway: false, flow: true, links: false },
      { cutaway: true, flow: true, links: false },
      { cutaway: false, flow: false, links: true },
      { cutaway: false, flow: false, links: false },
      { cutaway: false, flow: false, links: false },
    ]);
  });

  it('starts each chapter control only in the chapter that owns it', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].controls)).toEqual([
      undefined,
      ['trialKnots'],
      ['trialKnots', 'helm'],
      ['linkMode', 'videoDelayMs'],
      ['radarHeight', 'seaState'],
      undefined,
    ]);
    Object.entries(PRESETS).forEach(([id, preset]) =>
      Object.keys(preset.start ?? {}).forEach((control) =>
        expect(preset.controls, `${id}: ${control}`).toContain(control),
      ),
    );
    expect(PRESETS.hull.start).toEqual({ trialKnots: 11 });
    expect(PRESETS.jet.start).toEqual({ trialKnots: 22, helm: 'straight' });
    expect(PRESETS.horizon.start).toEqual({ seaState: 'slight' });
  });
});
