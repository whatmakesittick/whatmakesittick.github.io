import { describe, expect, it } from 'vitest';
import { spectralColor } from './spectrum';

describe('spectralColor', () => {
  it('paints 550 nm yellow-green', () => {
    const [red, green, blue] = spectralColor(550);
    expect(green).toBe(1);
    expect(red).toBeGreaterThan(0.5);
    expect(red).toBeLessThan(1);
    expect(blue).toBe(0);
  });

  it('runs from violet to red across the slider', () => {
    expect(spectralColor(400)).toEqual([expect.any(Number), 0, 1]);
    expect(spectralColor(400)[0]).toBeGreaterThan(0);
    expect(spectralColor(470)[2]).toBe(1);
    expect(spectralColor(700)).toEqual([1, 0, 0]);
  });

  it('keeps every channel between 0 and 1', () => {
    for (let wavelength = 380; wavelength <= 780; wavelength += 5) {
      spectralColor(wavelength).forEach((channel) => {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      });
    }
  });
});
