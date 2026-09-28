import { describe, expect, it } from 'vitest';
import { PART_IDS } from '../ids';
import { SPEED_RANGE } from '../timeline';
import { PRESETS } from './presets';

const PRESET_ORDER = ['overview', 'gradient', 'rotor', 'head', 'sprint', 'training'];

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

  it('never seeks or pauses, so every chapter keeps playing', () => {
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.pauseAt).toBeUndefined();
      expect(preset.startAt).toBeUndefined();
    });
  });

  it('plays each chapter at a speed the slider offers', () => {
    Object.values(PRESETS).forEach((preset) => {
      expect(preset.speed).toBeGreaterThanOrEqual(SPEED_RANGE.min);
      expect(preset.speed).toBeLessThanOrEqual(SPEED_RANGE.max);
    });
  });

  it('shows the sprint in real time and the seats at the slowest speed', () => {
    expect(PRESETS.sprint.speed).toBe(SPEED_RANGE.max);
    expect(PRESETS.head.speed).toBe(SPEED_RANGE.min);
  });

  it('opens the head in its chapter and hides the membrane around the rotor', () => {
    expect(PRESETS.head.view).toMatchObject({ cutaway: true });
    expect(PRESETS.rotor.view).toMatchObject({ membrane: false });
    expect(PRESETS.training.view).toMatchObject({ flow: false });
  });

  it('never sets the labels toggle', () => {
    Object.values(PRESETS).forEach((preset) => expect(preset.view?.labels).toBeUndefined());
  });

  it('pins a label for every chapter control it keeps', () => {
    expect(PRESETS.rotor.controls).toEqual(['ring']);
    expect(PRESETS.gradient.controls).toEqual(['oxygen']);
    expect(PRESETS.sprint.controls).toEqual(['event']);
    expect(PRESETS.training.controls).toEqual(['training']);
    expect(PRESETS.overview.controls).toBeUndefined();
    expect(PRESETS.head.controls).toBeUndefined();
  });
});
