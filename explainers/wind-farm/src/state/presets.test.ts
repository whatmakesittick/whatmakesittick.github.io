import { describe, expect, it } from 'vitest';
import { PRESET_IDS, SCENE_PARTS } from '../ids';
import { CYCLE_MINUTES, DEFAULT_SPEED, PHASE_RANGES, clockOf } from '../model';
import { sceneOf } from './derived';
import { PRESETS } from './presets';

describe('wind farm presets', () => {
  it('defines one preset per chapter at the default speed', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
    PRESET_IDS.forEach((id) => expect(PRESETS[id].speed).toBe(DEFAULT_SPEED));
  });

  it('labels and highlights only parts of the scene the chapter shows', () => {
    PRESET_IDS.forEach((id) => {
      const parts = SCENE_PARTS[sceneOf(id)];
      [...PRESETS[id].labels, ...PRESETS[id].highlight].forEach((part) =>
        expect(parts, `${id} ${part}`).toContain(part),
      );
    });
  });

  it('shows the farm in chapters 1, 5 and 6 and the turbine in chapters 2, 3 and 4', () => {
    expect(PRESET_IDS.map(sceneOf)).toEqual([
      'farm',
      'turbine',
      'turbine',
      'turbine',
      'farm',
      'farm',
    ]);
  });

  it('opens the nacelle only in its own chapter', () => {
    PRESET_IDS.forEach((id) => expect(PRESETS[id].view.cutaway).toBe(id === 'nacelle'));
  });

  it('starts every chapter inside the day and follows the day wind', () => {
    PRESET_IDS.forEach((id) => {
      const seek = PRESETS[id].startAt ?? PRESETS[id].pauseAt;
      expect(seek).toBeGreaterThanOrEqual(0);
      expect(seek).toBeLessThan(CYCLE_MINUTES);
      expect(PRESETS[id].start?.windOverride).toBeNull();
    });
    expect(PRESETS.wakes.pauseAt).toBeGreaterThanOrEqual(PHASE_RANGES.morning[0]);
  });

  it('opens each chapter on the hour', () => {
    const opening = PRESET_IDS.map((id) =>
      clockOf(PRESETS[id].startAt ?? PRESETS[id].pauseAt ?? 0),
    );
    expect(opening).toEqual(['12:00', '12:00', '13:00', '06:00', '09:00', '15:00']);
  });
});
