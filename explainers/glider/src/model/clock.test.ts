import { describe, expect, it } from 'vitest';
import { formatClock } from './clock';

describe('formatClock', () => {
  it('writes flight time as minutes and seconds', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(450)).toBe('7:30');
  });

  it('drops the fraction of a second', () => {
    expect(formatClock(2699.9)).toBe('44:59');
  });
});
