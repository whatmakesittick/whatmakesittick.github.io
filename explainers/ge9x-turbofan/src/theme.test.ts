import { describe, expect, it } from 'vitest';
import { THEME as CORE_THEME } from '@core/theme';
import { PHASE_IDS } from './ids';
import { HEAT_RAMP, PHASE_TONES, THEME, TONE_COLOURS } from './theme';

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

describe('theme', () => {
  it('keeps the core tokens', () => {
    expect(THEME).toMatchObject(CORE_THEME);
  });

  it('writes every colour as hex', () => {
    [...Object.values(THEME), ...Object.values(HEAT_RAMP)].forEach((colour) =>
      expect(colour).toMatch(HEX_COLOUR),
    );
  });

  it('gives each phase its own tone', () => {
    const tones = PHASE_IDS.map((id) => PHASE_TONES[id]);
    expect(new Set(tones).size).toBe(PHASE_IDS.length);
    expect(Object.keys(TONE_COLOURS)).toHaveLength(PHASE_IDS.length);
  });
});
