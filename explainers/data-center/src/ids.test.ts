import { describe, expect, it } from 'vitest';
import {
  ANCHOR_IDS,
  BENCHMARK_IDS,
  CAMERA_VIEW_IDS,
  CARRIER_IDS,
  CHAPTER_ACTION_IDS,
  COOLING_IDS,
  DISTANCE_IDS,
  DOCK_VIEW_IDS,
  FORM_IDS,
  LABEL_PRIORITY,
  LEFT_LABEL_PARTS,
  LOAD_IDS,
  MEDIUM_IDS,
  MOMENT_IDS,
  OUTAGE_IDS,
  PART_IDS,
  PHASE_IDS,
  PRESET_IDS,
  REGION_IDS,
  SOURCE_IDS,
  VIEW_IDS,
} from './ids';

const RANKED_FIRST = [
  'joule',
  'chipInset',
  'subjectRack',
  'busbar',
  'powerShelves',
  'cdu',
  'ups',
  'generators',
  'computeTrays',
  'switchTrays',
  'dryCoolers',
  'chiller',
  'spineSwitches',
  'leafSwitches',
  'laptop',
];

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

describe('ids', () => {
  it('names every id once', () => {
    [
      PART_IDS,
      PHASE_IDS,
      MOMENT_IDS,
      PRESET_IDS,
      CHAPTER_ACTION_IDS,
      COOLING_IDS,
      LOAD_IDS,
      BENCHMARK_IDS,
      DISTANCE_IDS,
      OUTAGE_IDS,
      SOURCE_IDS,
      CARRIER_IDS,
      FORM_IDS,
      MEDIUM_IDS,
      VIEW_IDS,
      CAMERA_VIEW_IDS,
      ANCHOR_IDS,
      REGION_IDS,
    ].forEach((ids) => expect(unique(ids)).toBe(true));
  });

  it('ranks the joule and the rack first, then every other part once in part order', () => {
    expect([...LABEL_PRIORITY].sort()).toEqual([...PART_IDS].sort());
    expect(LABEL_PRIORITY.slice(0, RANKED_FIRST.length)).toEqual(RANKED_FIRST);
    const rest = LABEL_PRIORITY.slice(RANKED_FIRST.length);
    expect(rest).toEqual(PART_IDS.filter((id) => rest.includes(id)));
  });

  it('puts only known parts on the left', () => {
    LEFT_LABEL_PARTS.forEach((id) => expect(PART_IDS).toContain(id));
    expect(unique(LEFT_LABEL_PARTS)).toBe(true);
  });

  it('gives each chapter its own fixed camera view and keeps one chase view', () => {
    const fixed = CAMERA_VIEW_IDS.filter((id) => id !== 'chase');
    expect(fixed).toHaveLength(PRESET_IDS.length);
    expect(CAMERA_VIEW_IDS).toContain('chase');
  });

  it('keeps the dock toggles a subset of the view flags plus the preset-only flags', () => {
    const dock: readonly string[] = DOCK_VIEW_IDS;
    DOCK_VIEW_IDS.forEach((id) => expect(VIEW_IDS).toContain(id));
    expect(VIEW_IDS.filter((id) => !dock.includes(id))).toEqual(['inset', 'lineUp']);
  });

  it('has six stages, four moments and one region per chapter', () => {
    expect(PHASE_IDS).toHaveLength(6);
    expect(MOMENT_IDS).toHaveLength(4);
    expect(REGION_IDS).toHaveLength(PRESET_IDS.length);
  });

  it('carries the joule as current and heat in water or air', () => {
    expect(FORM_IDS).toEqual(['current', 'heat']);
    MEDIUM_IDS.forEach((id) => expect(CARRIER_IDS).toContain(id));
  });
});
