import { describe, expect, it } from 'vitest';
import {
  FARM_PART_IDS,
  FOLLOW_DAY,
  PART_IDS,
  PRESET_IDS,
  PRESET_SCENES,
  SCENE_IDS,
  SCENE_PARTS,
  SPACING_CHOICE_IDS,
  SPACING_OPTIONS,
  TURBINE_PART_IDS,
  WIND_AT_IDS,
  WIND_PRESET_IDS,
} from './ids';

describe('ids', () => {
  it('names every part once', () => {
    expect(PART_IDS).toHaveLength(TURBINE_PART_IDS.length + FARM_PART_IDS.length);
    expect(new Set(PART_IDS).size).toBe(PART_IDS.length);
  });

  it('splits the parts between the two scenes with no overlap', () => {
    expect(Object.keys(SCENE_PARTS).sort()).toEqual([...SCENE_IDS].sort());
    const scenePartIds = SCENE_IDS.flatMap((scene) => [...SCENE_PARTS[scene]]);
    expect(scenePartIds).toHaveLength(PART_IDS.length);
    expect(new Set(scenePartIds)).toEqual(new Set(PART_IDS));
  });

  it('places every preset in a scene', () => {
    expect(Object.keys(PRESET_SCENES)).toEqual([...PRESET_IDS]);
    PRESET_IDS.forEach((preset) => {
      expect(SCENE_IDS).toContain(PRESET_SCENES[preset]);
    });
  });

  it('offers following the day before the wind presets', () => {
    expect(WIND_AT_IDS[0]).toBe('day');
    expect(WIND_AT_IDS).toEqual([FOLLOW_DAY, ...WIND_PRESET_IDS]);
  });

  it('labels each spacing choice with its rotor diameters', () => {
    expect(SPACING_CHOICE_IDS).toEqual(SPACING_OPTIONS.map(String));
  });
});
