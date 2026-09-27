import { describe, expect, it } from 'vitest';
import { FULL_TURN, clamp, lerp, smoothstep, wrapAngle } from './math';

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
    expect(clamp(3, 0, 2)).toBe(2);
  });
});

describe('lerp', () => {
  it('blends from one value to another by share', () => {
    expect(lerp(2, 6, 0)).toBe(2);
    expect(lerp(2, 6, 0.25)).toBe(3);
    expect(lerp(2, 6, 1)).toBe(6);
  });
});

describe('smoothstep', () => {
  it('eases a share between zero and one', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.25)).toBeCloseTo(0.15625);
  });

  it('holds flat outside zero and one', () => {
    expect(smoothstep(-0.5)).toBe(0);
    expect(smoothstep(1.5)).toBe(1);
  });

  it('eases a value across its own start and end', () => {
    expect(smoothstep(10, 10, 20)).toBe(0);
    expect(smoothstep(15, 10, 20)).toBe(0.5);
    expect(smoothstep(12.5, 10, 20)).toBeCloseTo(0.15625);
    expect(smoothstep(25, 10, 20)).toBe(1);
    expect(smoothstep(5, 10, 20)).toBe(0);
  });
});

describe('wrapAngle', () => {
  it('wraps an angle into half a turn either side of zero', () => {
    expect(wrapAngle(0)).toBe(0);
    expect(wrapAngle(1)).toBeCloseTo(1);
    expect(wrapAngle(FULL_TURN + 1)).toBeCloseTo(1);
    expect(wrapAngle(-FULL_TURN - 1)).toBeCloseTo(-1);
    expect(wrapAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2);
  });
});
