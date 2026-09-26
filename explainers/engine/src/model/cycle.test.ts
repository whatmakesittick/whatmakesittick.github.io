import { describe, expect, it } from 'vitest';
import { degreesForward, isWithinWindow, normalizeAngle, strokeAt, strokeProgress } from './cycle';

describe('cycle', () => {
  it('wraps angles into one 720 degree cycle', () => {
    expect(normalizeAngle(725)).toBe(5);
    expect(normalizeAngle(-10)).toBe(710);
    expect(normalizeAngle(720)).toBe(0);
  });

  it('names the four strokes in order', () => {
    expect(strokeAt(10)).toBe('intake');
    expect(strokeAt(190)).toBe('compression');
    expect(strokeAt(370)).toBe('power');
    expect(strokeAt(550)).toBe('exhaust');
    expect(strokeAt(730)).toBe('intake');
  });

  it('reports progress inside the current stroke', () => {
    expect(strokeProgress(0)).toBe(0);
    expect(strokeProgress(90)).toBeCloseTo(0.5);
    expect(strokeProgress(630)).toBeCloseTo(0.5);
  });

  it('measures forward distance across the cycle wrap', () => {
    expect(degreesForward(700, 20)).toBe(40);
    expect(degreesForward(20, 700)).toBe(680);
  });

  it('checks windows that cross the cycle wrap', () => {
    expect(isWithinWindow(715, 705, 30)).toBe(true);
    expect(isWithinWindow(10, 705, 30)).toBe(true);
    expect(isWithinWindow(20, 705, 30)).toBe(false);
  });
});
