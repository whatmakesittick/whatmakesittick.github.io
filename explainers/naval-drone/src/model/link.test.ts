import { describe, expect, it } from 'vitest';
import { VIDEO_DELAY_MS, boatLengths, lagMetres } from './link';

describe('video delay', () => {
  it('lets the reader set the delay from 50 ms to a full second, 250 ms at first', () => {
    expect(VIDEO_DELAY_MS).toEqual({ min: 50, max: 1000, step: 10, default: 250 });
  });

  it('turns a quarter second at 42 kn into 5.4 m, about one boat length', () => {
    expect(lagMetres(250, 42)).toBeCloseTo(5.4, 1);
    expect(boatLengths(lagMetres(250, 42))).toBeCloseTo(1, 1);
  });

  it('grows with the delay and the speed and vanishes at rest', () => {
    expect(lagMetres(1000, 42)).toBeCloseTo(21.6, 1);
    expect(lagMetres(250, 22)).toBeCloseTo(2.83, 2);
    expect(lagMetres(250, 0)).toBe(0);
  });
});
