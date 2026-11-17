import { describe, expect, it } from 'vitest';
import { THEME as CORE_THEME } from '@core/theme';
import { ELEMENT_IDS, ODORANT_IDS, PHASE_IDS } from './ids';
import { ATOM_COLOURS, ODORANT_COLOURS, PHASE_TONES, TASTE_GLOWS, THEME } from './theme';

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

function distinct(values: readonly string[]): number {
  return new Set(values).size;
}

describe('theme', () => {
  it('keeps the core tokens', () => {
    expect(THEME).toMatchObject(CORE_THEME);
  });

  it('writes every colour as hex', () => {
    Object.values(THEME).forEach((colour) => expect(colour).toMatch(HEX_COLOUR));
  });

  it('uses the deep plum background and the spec tones', () => {
    expect(THEME.sceneBackground).toBe('#1c1520');
    expect(PHASE_TONES.spoon).toBe('#9cc9e6');
    expect(PHASE_TONES.swallow).toBe('#c0304a');
  });

  it('gives each phase of the bite its own tone', () => {
    expect(Object.keys(PHASE_TONES)).toEqual([...PHASE_IDS]);
    expect(distinct(Object.values(PHASE_TONES))).toBe(PHASE_IDS.length);
  });

  it('gives each odorant and each element its own colour', () => {
    expect(Object.keys(ODORANT_COLOURS)).toEqual([...ODORANT_IDS]);
    expect(distinct(Object.values(ODORANT_COLOURS))).toBe(ODORANT_IDS.length);
    expect(Object.keys(ATOM_COLOURS)).toEqual([...ELEMENT_IDS]);
    expect(distinct(Object.values(ATOM_COLOURS))).toBe(ELEMENT_IDS.length);
  });

  it('glows sweet, sour and cold in three different colours', () => {
    expect(distinct(Object.values(TASTE_GLOWS))).toBe(3);
  });
});
