import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { PHASE_TONES, THEME } from './theme';

describe('theme', () => {
  it('has a distinct tone for every phase', () => {
    const tones = PHASE_IDS.map((id) => PHASE_TONES[id]);
    expect(new Set(tones).size).toBe(PHASE_IDS.length);
    tones.forEach((tone) => expect(tone).toMatch(/^#[0-9a-f]{6}$/));
  });

  it('keeps the left and right accents apart', () => {
    expect(THEME.rightAccent).not.toBe(THEME.leftAccent);
  });
});
