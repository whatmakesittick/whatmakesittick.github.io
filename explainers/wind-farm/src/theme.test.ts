import { describe, expect, it } from 'vitest';
import { THEME as CORE_THEME } from '@core/theme';
import { OPERATING_STATE_IDS, PHASE_IDS } from './ids';
import { PHASE_TONES, STATE_TONES, THEME } from './theme';

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

describe('theme', () => {
  it('keeps the core tokens', () => {
    expect(THEME).toMatchObject(CORE_THEME);
  });

  it('writes every colour as hex', () => {
    Object.values(THEME).forEach((colour) => {
      expect(colour).toMatch(HEX_COLOUR);
    });
  });

  it('gives each phase of the day its own tone', () => {
    expect(Object.keys(PHASE_TONES)).toEqual([...PHASE_IDS]);
    expect(new Set(Object.values(PHASE_TONES)).size).toBe(PHASE_IDS.length);
    Object.values(PHASE_TONES).forEach((tone) => {
      expect(tone).toMatch(HEX_COLOUR);
    });
  });

  it('gives each operating state a tone', () => {
    expect(Object.keys(STATE_TONES)).toEqual([...OPERATING_STATE_IDS]);
    Object.values(STATE_TONES).forEach((tone) => {
      expect(tone).toMatch(HEX_COLOUR);
    });
  });
});
