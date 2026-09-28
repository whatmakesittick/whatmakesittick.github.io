import { describe, expect, it, vi } from 'vitest';
import { memoizeLast } from './memo';

describe('memoizeLast', () => {
  it('computes again only when an argument changes', () => {
    const compute = vi.fn((a: number, b: string) => ({ a, b }));
    const memo = memoizeLast(compute);
    const first = memo(1, 'x');
    expect(memo(1, 'x')).toBe(first);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(memo(2, 'x')).toEqual({ a: 2, b: 'x' });
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
