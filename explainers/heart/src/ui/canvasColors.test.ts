import { describe, expect, it } from 'vitest';
import { WAVE_BANDS } from './canvasColors';

describe('canvas colours', () => {
  it('tints each wave band with the tone of its chip', () => {
    expect(WAVE_BANDS.p).toMatch(/^rgb\(240 163 94 \//);
    expect(WAVE_BANDS.qrs).toMatch(/^rgb\(255 77 94 \//);
    expect(WAVE_BANDS.t).toMatch(/^rgb\(196 140 255 \//);
  });
});
