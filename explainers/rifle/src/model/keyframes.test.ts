import { describe, expect, it } from 'vitest';
import {
  accelerate,
  decelerate,
  easeInOut,
  keyframes,
  linear,
  progress,
  timeWhen,
} from './keyframes';

describe('keyframes', () => {
  const track = keyframes([
    { at: 0, value: 0 },
    { at: 10, value: 10 },
    { at: 20, value: 30, ease: decelerate },
    { at: 30, value: 30 },
  ]);

  it('holds the first and last value outside the keys', () => {
    expect(track(-5)).toBe(0);
    expect(track(45)).toBe(30);
  });

  it('runs each segment from key to key with the ease of the later key', () => {
    expect(track(5)).toBe(5);
    expect(track(10)).toBe(10);
    expect(track(15)).toBeCloseTo(10 + 20 * 0.75);
    expect(track(25)).toBe(30);
  });

  it('eases from 0 to 1 in every shape', () => {
    [linear, accelerate, decelerate, easeInOut].forEach((ease) => {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
    });
    expect(accelerate(0.5)).toBe(0.25);
    expect(decelerate(0.5)).toBe(0.75);
    expect(easeInOut(0.5)).toBe(0.5);
  });

  it('gives the share of a span, clamped to it', () => {
    expect(progress(5, 0, 10)).toBe(0.5);
    expect(progress(-1, 0, 10)).toBe(0);
    expect(progress(11, 0, 10)).toBe(1);
  });

  it('finds when a rising track reaches a value', () => {
    expect(timeWhen(track, 5, 0, 10)).toBeCloseTo(5, 6);
    expect(track(timeWhen(track, 22.5, 10, 20))).toBeCloseTo(22.5, 6);
  });
});
