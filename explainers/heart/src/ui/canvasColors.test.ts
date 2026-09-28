import { describe, expect, it } from 'vitest';
import { WAVE_BANDS, withAlpha } from './canvasColors';

describe('canvas colours', () => {
  it('turns a hex colour into rgb with the alpha it is given', () => {
    expect(withAlpha('#ff4d5e', 0.5)).toBe('rgb(255 77 94 / 0.5)');
    expect(withAlpha('#FFD166', 0)).toBe('rgb(255 209 102 / 0)');
  });

  it('refuses anything but a six digit hex colour', () => {
    expect(() => withAlpha('#fff', 1)).toThrow('#rrggbb');
    expect(() => withAlpha('rgb(0 0 0)', 1)).toThrow('#rrggbb');
  });

  it('tints each wave band with the tone of its chip', () => {
    expect(WAVE_BANDS.p).toMatch(/^rgb\(240 163 94 \//);
    expect(WAVE_BANDS.qrs).toMatch(/^rgb\(255 77 94 \//);
    expect(WAVE_BANDS.t).toMatch(/^rgb\(196 140 255 \//);
  });
});
