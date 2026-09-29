import { describe, expect, it } from 'vitest';
import { withAlpha } from './color';

describe('colour helpers', () => {
  it('turns a hex colour into rgb with the alpha it is given', () => {
    expect(withAlpha('#ff4d5e', 0.5)).toBe('rgb(255 77 94 / 0.5)');
    expect(withAlpha('#FFD166', 0)).toBe('rgb(255 209 102 / 0)');
  });

  it('refuses anything but a six digit hex colour', () => {
    expect(() => withAlpha('#fff', 1)).toThrow('#rrggbb');
    expect(() => withAlpha('rgb(0 0 0)', 1)).toThrow('#rrggbb');
  });
});
