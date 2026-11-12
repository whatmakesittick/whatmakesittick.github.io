import { describe, expect, it } from 'vitest';
import { THEME as CORE_THEME } from '@core/theme';
import { PHASE_IDS } from './ids';
import { BAY_TONES, PHASE_TONES, THEME } from './theme';

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

describe('theme', () => {
  it('keeps the core tokens', () => {
    expect(THEME).toMatchObject(CORE_THEME);
  });

  it('writes every colour as hex', () => {
    Object.values(THEME).forEach((colour) => expect(colour).toMatch(HEX_COLOUR));
  });

  it('gives each phase a tone and shares the euv tone from the collector to the mask', () => {
    expect(Object.keys(PHASE_TONES)).toEqual([...PHASE_IDS]);
    Object.values(PHASE_TONES).forEach((tone) => expect(tone).toMatch(HEX_COLOUR));
    expect(PHASE_TONES.collect).toBe(THEME.euv);
    expect(PHASE_TONES.mask).toBe(THEME.euv);
  });

  it('writes every bay tone as hex', () => {
    Object.values(BAY_TONES).forEach((colour) => expect(colour).toMatch(HEX_COLOUR));
  });

  it('tells the drive laser from the euv beam', () => {
    expect(THEME.laser).not.toBe(THEME.euv);
  });
});
