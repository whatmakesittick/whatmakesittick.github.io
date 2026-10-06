import { describe, expect, it } from 'vitest';
import { PART_IDS, PRESET_IDS } from '../ids';
import { PHASE_RANGES } from '../model';
import { CAMERA_VIEWS } from '../scene/cameraViews';
import { DEFAULT_SPEED, PICTURE_SPEED } from '../model';
import { PRESETS } from './presets';

const SCENE_FLAGS = ['cutaway', 'fieldLines', 'voxel'] as const;

describe('chapter presets', () => {
  it('has the six chapters in reading order', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
  });

  it('frames each chapter with a known camera view', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual([
      'room',
      'cryostat',
      'voxel',
      'coil',
      'gradient',
      'console',
    ]);
    for (const id of PRESET_IDS) expect(CAMERA_VIEWS).toHaveProperty(PRESETS[id].camera);
  });

  it('labels and highlights only known parts', () => {
    for (const id of PRESET_IDS) {
      const { labels, highlight } = PRESETS[id];
      for (const part of [...labels, ...highlight]) expect(PART_IDS).toContain(part);
    }
  });

  it('highlights the shims with the magnet layers', () => {
    expect(PRESETS.magnet.highlight).toEqual([...PRESETS.magnet.labels, 'shims']);
  });

  it('plays every chapter at the default speed except the picture', () => {
    for (const id of PRESET_IDS) {
      expect(PRESETS[id].speed).toBe(id === 'picture' ? PICTURE_SPEED : DEFAULT_SPEED);
    }
  });

  it('holds the spins at the loop start and seeks the others', () => {
    expect(PRESETS.spins).toMatchObject({ pauseAt: 0 });
    expect(PRESETS.spins.startAt).toBeUndefined();
    expect(PRESETS.overview.startAt).toBe(0);
    expect(PRESETS.magnet.startAt).toBe(0);
    expect(PRESETS.resonance.startAt).toBe(0);
    expect(PRESETS.gradients.startAt).toBe(PHASE_RANGES.encode[0]);
    expect(PRESETS.picture.startAt).toBe(PHASE_RANGES.echo[0]);
  });

  it('sets the cutaway, the field lines and the voxel for each chapter, never the labels', () => {
    for (const id of PRESET_IDS) {
      expect(Object.keys(PRESETS[id].view).sort()).toEqual([...SCENE_FLAGS].sort());
    }
    expect(PRESETS.magnet.view).toEqual({ cutaway: true, fieldLines: true, voxel: false });
    expect(PRESETS.spins.view.voxel).toBe(true);
    expect(PRESETS.resonance.view.voxel).toBe(true);
  });

  it('starts the chapter controls the spec names', () => {
    expect(PRESETS.overview.start).toEqual({ linesFilled: 24 });
    expect(PRESETS.magnet.start).toBeUndefined();
    expect(PRESETS.spins.start).toBeUndefined();
    expect(PRESETS.resonance.start).toBeUndefined();
    expect(PRESETS.gradients.start).toEqual({ gradientAxis: null });
    expect(PRESETS.picture.start).toEqual({ linesFilled: 8 });
  });
});
