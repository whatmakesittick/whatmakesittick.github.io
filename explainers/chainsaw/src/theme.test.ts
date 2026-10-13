import { describe, expect, it } from 'vitest';
import { THEME as CORE_THEME } from '@core/theme';
import { CLUTCH_STATE_IDS, ENGINE_STATE_IDS, PHASE_IDS } from './ids';
import { CLUTCH_TONES, ENGINE_TONES, PHASE_TONES, THEME } from './theme';

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

describe('theme', () => {
  it('keeps the core tokens', () => {
    expect(THEME).toMatchObject(CORE_THEME);
  });

  it('writes every colour as hex', () => {
    Object.values(THEME).forEach((colour) => expect(colour).toMatch(HEX_COLOUR));
  });

  it('gives each phase of the turn its own tone', () => {
    expect(Object.keys(PHASE_TONES)).toEqual([...PHASE_IDS]);
    expect(new Set(Object.values(PHASE_TONES)).size).toBe(PHASE_IDS.length);
  });

  it('gives each clutch state its own tone', () => {
    expect(Object.keys(CLUTCH_TONES)).toEqual([...CLUTCH_STATE_IDS]);
    expect(new Set(Object.values(CLUTCH_TONES)).size).toBe(CLUTCH_STATE_IDS.length);
  });

  it('gives each engine state its own tone', () => {
    expect(Object.keys(ENGINE_TONES)).toEqual([...ENGINE_STATE_IDS]);
    expect(new Set(Object.values(ENGINE_TONES)).size).toBe(ENGINE_STATE_IDS.length);
  });
});
