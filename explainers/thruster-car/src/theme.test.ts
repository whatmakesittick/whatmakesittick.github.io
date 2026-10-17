import { describe, expect, it } from 'vitest';
import { THEME as CORE_THEME } from '@core/theme';
import { GAS_IDS, PHASE_IDS } from './ids';
import { PHASE_TONES, PLUME_COLOURS, THEME } from './theme';

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

  it('draws air and nitrogen as a white cloud and helium pale blue', () => {
    expect(Object.keys(PLUME_COLOURS)).toEqual([...GAS_IDS]);
    expect(PLUME_COLOURS.air).toBe(PLUME_COLOURS.nitrogen);
    expect(PLUME_COLOURS.helium).not.toBe(PLUME_COLOURS.air);
  });
});
