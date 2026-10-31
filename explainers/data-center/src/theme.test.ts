import { describe, expect, it } from 'vitest';
import { THEME as CORE_THEME } from '@core/theme';
import { PHASE_IDS } from './ids';
import { PHASE_TONES, THEME } from './theme';

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

describe('theme', () => {
  it('keeps the core tokens', () => {
    expect(THEME).toMatchObject(CORE_THEME);
  });

  it('writes every colour as hex', () => {
    Object.values(THEME).forEach((colour) => expect(colour).toMatch(HEX_COLOUR));
  });

  it('gives each stage of the run its own tone', () => {
    expect(Object.keys(PHASE_TONES)).toEqual([...PHASE_IDS]);
    Object.values(PHASE_TONES).forEach((tone) => expect(tone).toMatch(HEX_COLOUR));
    expect(new Set(Object.values(PHASE_TONES)).size).toBe(PHASE_IDS.length);
  });

  it('tells current from heat and the supply water from the return', () => {
    expect(THEME.current).not.toBe(THEME.heat);
    expect(THEME.coolantSupply).not.toBe(THEME.coolantReturn);
    expect(THEME.packet).not.toBe(THEME.current);
  });
});
