import { describe, expect, it } from 'vitest';
import { THEME as CORE_THEME } from '@core/theme';
import { ELEMENT_IDS, PHASE_IDS } from './ids';
import { ATOM_COLOURS, LIQUID_TINTS, PHASE_TONES, THEME } from './theme';

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

describe('theme', () => {
  it('keeps the core tokens', () => {
    expect(THEME).toMatchObject(CORE_THEME);
  });

  it('writes every colour as hex', () => {
    Object.values(THEME).forEach((colour) => expect(colour).toMatch(HEX_COLOUR));
  });

  it('gives each phase of the run its own tone', () => {
    expect(Object.keys(PHASE_TONES)).toEqual([...PHASE_IDS]);
    expect(new Set(Object.values(PHASE_TONES)).size).toBe(PHASE_IDS.length);
  });

  it('gives each element its own colour', () => {
    expect(Object.keys(ATOM_COLOURS)).toEqual([...ELEMENT_IDS]);
    expect(new Set(Object.values(ATOM_COLOURS)).size).toBe(ELEMENT_IDS.length);
  });

  it('tints the liquid from nearly clear to blue-black', () => {
    expect(LIQUID_TINTS.clear).toBe('#cfe3ee');
    expect(LIQUID_TINTS.dark).toBe(THEME.blueBlack);
    expect(LIQUID_TINTS.clearOpacity).toBeLessThan(1);
  });
});
