import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { SPEED_RANGE } from '../timeline';
import { PRESETS, presetHighlight, propellantHighlight } from './presets';

const PRESET_ORDER = ['overview', 'propellants', 'pumps', 'chamber', 'nozzle', 'ascent'];
const DEFAULTS = { propellant: 'methane' } as const;

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
    expect(Object.values(PRESETS).map((preset) => preset.camera)).toEqual([
      'hero',
      'powerhead',
      'turbopumps',
      'chamber',
      'nozzle',
      'booster',
    ]);
  });

  it('plays each chapter at the speed stop the spec asks for', () => {
    expect(Object.values(PRESETS).map((preset) => preset.speed)).toEqual([3, 2, 0, 1, 3, 4]);
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.speed).toBeGreaterThanOrEqual(SPEED_RANGE.min);
      expect(preset.speed).toBeLessThanOrEqual(SPEED_RANGE.max);
    });
  });

  it('seeks each chapter to its moment and pauses only the nozzle at liftoff', () => {
    expect(Object.values(PRESETS).map((preset) => preset.startAt)).toEqual([
      0,
      23,
      0,
      23,
      undefined,
      3,
    ]);
    expect(PRESETS.nozzle.pauseAt).toBe(3);
    ['overview', 'propellants', 'pumps', 'chamber', 'ascent'].forEach((id) =>
      expect(PRESETS[id as keyof typeof PRESETS].pauseAt, id).toBeUndefined(),
    );
  });

  it('cuts the engine open with the flow on only for the inside chapters', () => {
    const cut = Object.entries(PRESETS)
      .filter(([, preset]) => preset.view?.cutaway)
      .map(([id]) => id);
    expect(cut).toEqual(['propellants', 'pumps', 'chamber']);
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.view?.flow).toBe(preset.view?.cutaway);
      expect(preset.view?.flame).toBe(true);
    });
    expect(PRESETS.ascent.view?.cluster).toBe(true);
  });

  it('never sets the labels toggle', () => {
    Object.values(PRESETS).forEach((preset) => expect(preset.view?.labels).toBeUndefined());
  });

  it('lists the chapter controls each chapter keeps', () => {
    expect(PRESETS.propellants.controls).toEqual(['propellant']);
    expect(PRESETS.pumps.controls).toEqual(['engine']);
    ['overview', 'chamber', 'nozzle', 'ascent'].forEach((id) =>
      expect(PRESETS[id as keyof typeof PRESETS].controls, id).toBeUndefined(),
    );
  });
});

describe('chapter highlight', () => {
  it('highlights the route of the propellant the reader picked', () => {
    expect(presetHighlight(PRESETS.propellants, DEFAULTS)).toEqual([
      'methaneInlet',
      'methanePump',
      'coolingChannels',
      'methanePreburner',
      'liquidMethane',
    ]);
    expect(presetHighlight(PRESETS.propellants, { propellant: 'oxygen' })).toEqual([
      'oxygenInlet',
      'oxygenPump',
      'oxygenPreburner',
      'liquidOxygen',
    ]);
  });

  it('starts the propellants chapter with the highlight of its default choice', () => {
    expect(PRESETS.propellants.highlight).toEqual(propellantHighlight('methane'));
  });

  it('keeps the chapter highlight elsewhere', () => {
    expect(presetHighlight(PRESETS.pumps, DEFAULTS)).toBe(PRESETS.pumps.highlight);
    expect(presetHighlight(PRESETS.chamber, DEFAULTS)).toContain('hotGasManifold');
    expect(presetHighlight(PRESETS.overview, DEFAULTS)).toEqual([]);
    expect(presetHighlight(PRESETS.ascent, DEFAULTS)).toEqual([]);
  });
});
