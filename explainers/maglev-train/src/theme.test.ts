import { describe, expect, it } from 'vitest';
import { THEME as CORE_THEME } from '@core/theme';
import { PHASE_IDS } from './ids';
import { PHASE_TONES, THEME, WAVE_PHASE_COLOURS } from './theme';

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;
const WAVE_PHASE_COUNT = 3;

describe('theme', () => {
  it('keeps the core tokens', () => {
    expect(THEME).toMatchObject(CORE_THEME);
  });

  it('writes every colour as hex', () => {
    Object.values(THEME).forEach((colour) => expect(colour).toMatch(HEX_COLOUR));
  });

  it('gives each stage of the ride its own tone', () => {
    expect(Object.keys(PHASE_TONES)).toEqual([...PHASE_IDS]);
    Object.values(PHASE_TONES).forEach((tone) => expect(tone).toMatch(HEX_COLOUR));
    expect(new Set(Object.values(PHASE_TONES)).size).toBe(PHASE_IDS.length);
  });

  it('draws the three phases of the wave in three different colours', () => {
    expect(WAVE_PHASE_COLOURS).toEqual([THEME.phaseA, THEME.phaseB, THEME.phaseC]);
    expect(new Set(WAVE_PHASE_COLOURS).size).toBe(WAVE_PHASE_COUNT);
  });
});
