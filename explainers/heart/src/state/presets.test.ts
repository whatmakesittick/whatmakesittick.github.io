import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { SPEED_RANGE } from '../timeline';
import { PRESETS, presetHighlight, valveHighlight } from './presets';

const PRESET_ORDER = ['overview', 'chambers', 'valves', 'cycle', 'conduction', 'circulation'];
const DEFAULTS = { chamber: 'leftVentricle', valve: 'mitral' } as const;

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

  it('plays each chapter at the slow-motion stop the spec asks for', () => {
    expect(Object.values(PRESETS).map((preset) => preset.speed)).toEqual([2, 1, 0, 1, 0, 3]);
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.speed).toBeGreaterThanOrEqual(SPEED_RANGE.min);
      expect(preset.speed).toBeLessThanOrEqual(SPEED_RANGE.max);
    });
  });

  it('seeks the start of the beat only for the cycle and the conduction', () => {
    expect(PRESETS.cycle.startAt).toBe(0);
    expect(PRESETS.conduction.startAt).toBe(0);
    ['overview', 'chambers', 'valves', 'circulation'].forEach((id) =>
      expect(PRESETS[id as keyof typeof PRESETS].startAt, id).toBeUndefined(),
    );
    Object.values(PRESETS).forEach((preset) => expect(preset.pauseAt).toBeUndefined());
  });

  it('never sets the labels toggle', () => {
    Object.values(PRESETS).forEach((preset) => expect(preset.view?.labels).toBeUndefined());
  });

  it('lists the chapter controls each chapter keeps', () => {
    expect(PRESETS.chambers.controls).toEqual(['chamber']);
    expect(PRESETS.valves.controls).toEqual(['valve']);
    expect(PRESETS.circulation.controls).toEqual(['effort', 'fitness']);
    ['overview', 'cycle', 'conduction'].forEach((id) =>
      expect(PRESETS[id as keyof typeof PRESETS].controls, id).toBeUndefined(),
    );
  });
});

describe('chapter highlight', () => {
  it('highlights the chamber the reader picked', () => {
    expect(presetHighlight(PRESETS.chambers, DEFAULTS)).toEqual(['leftVentricle']);
    expect(presetHighlight(PRESETS.chambers, { ...DEFAULTS, chamber: 'rightAtrium' })).toEqual([
      'rightAtrium',
    ]);
  });

  it('highlights the picked valve with its cords when it has them', () => {
    expect(presetHighlight(PRESETS.valves, DEFAULTS)).toEqual(['mitralValve', 'chordae']);
    expect(valveHighlight('tricuspid')).toEqual(['tricuspidValve', 'chordae']);
    expect(valveHighlight('aortic')).toEqual(['aorticValve']);
    expect(valveHighlight('pulmonary')).toEqual(['pulmonaryValve']);
  });

  it('starts each picking chapter with the highlight of its default choice', () => {
    expect(PRESETS.chambers.highlight).toEqual(presetHighlight(PRESETS.chambers, DEFAULTS));
    expect(PRESETS.valves.highlight).toEqual(presetHighlight(PRESETS.valves, DEFAULTS));
  });

  it('keeps the chapter highlight elsewhere', () => {
    expect(presetHighlight(PRESETS.cycle, DEFAULTS)).toBe(PRESETS.cycle.highlight);
    expect(PRESETS.cycle.highlight).toContain('arterialBlood');
    expect(presetHighlight(PRESETS.overview, DEFAULTS)).toEqual([]);
  });
});
