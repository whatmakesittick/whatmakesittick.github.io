import { describe, expect, it } from 'vitest';
import { THEME as CORE_THEME } from '@core/theme';
import { GRADIENT_AXIS_IDS, PHASE_IDS, TISSUE_IDS } from './ids';
import { GRADIENT_TONES, PHASE_TONES, THEME, TISSUE_TONES } from './theme';

describe('theme', () => {
  it('keeps the core tokens', () => {
    expect(THEME).toMatchObject(CORE_THEME);
  });

  it('colours the five steps amber, green, amber, cyan and grey', () => {
    expect(Object.keys(PHASE_TONES)).toEqual([...PHASE_IDS]);
    expect(PHASE_TONES.excite).toBe(THEME.rf);
    expect(PHASE_TONES.encode).toBe(THEME.gradY);
    expect(PHASE_TONES.refocus).toBe(THEME.rf);
    expect(PHASE_TONES.echo).toBe(THEME.echo);
    expect(PHASE_TONES.recover).toBe(THEME.rest);
  });

  it('gives each gradient axis and each tissue its own colour', () => {
    expect(Object.keys(GRADIENT_TONES)).toEqual([...GRADIENT_AXIS_IDS]);
    expect(new Set(Object.values(GRADIENT_TONES)).size).toBe(GRADIENT_AXIS_IDS.length);
    expect(Object.keys(TISSUE_TONES)).toEqual([...TISSUE_IDS]);
    expect(new Set(Object.values(TISSUE_TONES)).size).toBe(TISSUE_IDS.length);
  });
});
