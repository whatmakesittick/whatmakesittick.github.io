import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, PART_IDS, PRESET_IDS } from '../ids';
import { PRESETS } from './presets';

describe('euv presets', () => {
  it('defines one preset per chapter', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
  });

  it('uses a known camera view', () => {
    PRESET_IDS.forEach((id) => expect(CAMERA_VIEW_IDS, id).toContain(PRESETS[id].camera));
  });

  it('names only known parts in labels and highlights', () => {
    PRESET_IDS.forEach((id) => {
      [...PRESETS[id].labels, ...PRESETS[id].highlight].forEach((part) =>
        expect(PART_IDS, `${id} ${part}`).toContain(part),
      );
    });
  });

  it('starts or pauses, never both', () => {
    PRESET_IDS.forEach((id) => {
      const { startAt, pauseAt } = PRESETS[id];
      expect(startAt !== undefined && pauseAt !== undefined, id).toBe(false);
    });
  });

  it('pauses the mirrors and compare chapters and plays the rest', () => {
    expect(PRESET_IDS.filter((id) => PRESETS[id].pauseAt !== undefined)).toEqual([
      'mirrors',
      'compare',
    ]);
  });
});
