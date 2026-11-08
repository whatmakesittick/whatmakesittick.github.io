import { describe, expect, it } from 'vitest';
import { PART_IDS, PRESET_IDS, VIEW_IDS } from '../ids';
import type { PhaseId, PresetId } from '../ids';
import { MOMENTS, phaseAt } from '../model';
import { PRESETS } from './presets';

const START_PHASES: Readonly<Record<PresetId, PhaseId>> = {
  key: 'press',
  lever: 'press',
  letGo: 'press',
  dampers: 'press',
  room: 'escape',
  compare: 'press',
};

const READER_VIEWS = ['labels', 'sound', 'follow'];

function viewsOn(id: PresetId): readonly string[] {
  return Object.entries(PRESETS[id].view)
    .filter(([, on]) => on)
    .map(([flag]) => flag)
    .sort();
}

describe('piano presets', () => {
  it('defines one preset per chapter with the camera the table names', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual([
      'grand',
      'action',
      'escapement',
      'dampers',
      'soundboard',
      'lineUp',
    ]);
  });

  it('names only known parts in labels and highlights', () => {
    PRESET_IDS.forEach((id) => {
      [...PRESETS[id].labels, ...PRESETS[id].highlight].forEach((part) =>
        expect(PART_IDS, `${id} ${part}`).toContain(part),
      );
    });
  });

  it('plays the lever and the line-up slowly and the let-off at the slowest stop', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].speed)).toEqual([2, 1, 0, 2, 2, 1]);
  });

  it('starts late in the press for the let-off and in free flight for the room', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].startAt)).toEqual([0, 0, 250, 0, 380, 0]);
    expect(PRESETS.room.startAt).toBeGreaterThan(MOMENTS.letOff);
    expect(PRESETS.room.startAt).toBeLessThan(MOMENTS.strike);
    PRESET_IDS.forEach((id) =>
      expect(phaseAt(PRESETS[id].startAt ?? NaN), id).toBe(START_PHASES[id]),
    );
  });

  it('never pauses', () => {
    PRESET_IDS.forEach((id) => expect(PRESETS[id].pauseAt, id).toBeUndefined());
  });

  it('sets every view flag but the reader ones', () => {
    PRESET_IDS.forEach((id) =>
      expect(Object.keys(PRESETS[id].view).sort(), id).toEqual(
        VIEW_IDS.filter((flag) => !READER_VIEWS.includes(flag)).sort(),
      ),
    );
  });

  it('turns on the views each chapter needs and nothing else', () => {
    expect(viewsOn('key')).toEqual(['cutaway']);
    expect(viewsOn('lever')).toEqual(['cutaway']);
    expect(viewsOn('letGo')).toEqual(['cutaway', 'inset']);
    expect(viewsOn('dampers')).toEqual(['cutaway']);
    expect(viewsOn('room')).toEqual(['cutaway', 'wave']);
    expect(viewsOn('compare')).toEqual(['cutaway', 'lineUp']);
  });

  it('starts middle C in the first five chapters and the grand in the line-up', () => {
    ['key', 'lever', 'letGo', 'dampers', 'room'].forEach((id) =>
      expect(PRESETS[id as PresetId].start, id).toEqual({ register: 'middle' }),
    );
    expect(PRESETS.compare.start).toEqual({ compare: 'grand' });
  });

  it('labels and highlights the parts of each chapter', () => {
    expect(PRESETS.key.labels).toEqual([
      'key',
      'hammer',
      'damper',
      'strings',
      'soundboard',
      'plate',
      'case',
      'pedals',
    ]);
    expect(PRESETS.key.highlight).toEqual([]);
    const lever = ['key', 'capstan', 'wippen', 'jack', 'knuckle', 'hammer'];
    expect(PRESETS.lever.labels).toEqual([...lever, 'strings']);
    expect(PRESETS.lever.highlight).toEqual(lever);
    const escapement = [
      'jack',
      'knuckle',
      'letOffButton',
      'repetitionLever',
      'backCheck',
      'hammer',
      'inset',
    ];
    expect(PRESETS.letGo.labels).toEqual(escapement);
    expect(PRESETS.letGo.highlight).toEqual(escapement);
    expect(PRESETS.dampers.labels).toEqual(['damper', 'strings', 'hammer', 'actions']);
    expect(PRESETS.dampers.highlight).toEqual(['damper', 'strings', 'hammer']);
    const room = ['strings', 'bridge', 'soundboard', 'plate'];
    expect(PRESETS.room.labels).toEqual([...room, 'bassStrings', 'tuningPins']);
    expect(PRESETS.room.highlight).toEqual(room);
    expect(PRESETS.compare.labels).toEqual([
      'hammer',
      'jack',
      'upright',
      'harpsichord',
      'uprightHammer',
      'hammerButt',
      'bridleTape',
      'uprightDamper',
      'uprightStrings',
      'harpsichordJack',
      'tongue',
      'plectrum',
      'harpsichordDamper',
      'harpsichordString',
    ]);
    expect(PRESETS.compare.highlight).toEqual(['key', 'hammer', 'jack', 'upright', 'harpsichord']);
  });
});
