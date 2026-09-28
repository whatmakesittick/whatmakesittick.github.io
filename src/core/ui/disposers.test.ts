import { describe, expect, it } from 'vitest';
import { disposeAll } from './disposers';

describe('disposers', () => {
  it('runs every disposer once, in the order given', () => {
    const calls: string[] = [];
    const dispose = disposeAll([() => calls.push('first'), () => calls.push('second')]);
    expect(calls).toEqual([]);
    dispose();
    expect(calls).toEqual(['first', 'second']);
  });
});
