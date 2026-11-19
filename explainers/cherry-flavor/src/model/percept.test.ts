import { describe, expect, it } from 'vitest';
import { DESK_START } from './odorants';
import { perceptAt, smellOf } from './percept';

describe('percept', () => {
  it('smells the spoon before the bite unless pinched', () => {
    expect(perceptAt(-1, 0.05, 0, false)).toBe('smell');
    expect(perceptAt(-1, 0, 0, true)).toBe('nothing');
  });

  it('tastes flavor only with an open nose', () => {
    expect(perceptAt(8, 0.3, 1, false)).toBe('flavor');
    expect(perceptAt(8, 0, 1, true)).toBe('pinched');
    expect(perceptAt(0.2, 0, 0.1, false)).toBe('cold');
    expect(perceptAt(3, 0.01, 0.6, false)).toBe('sweet');
  });

  it('leaves an aftertaste after the swallow', () => {
    expect(perceptAt(14, 0.2, 0, false)).toBe('aftertaste');
    expect(perceptAt(18, 0.01, 0, false)).toBe('gone');
  });

  it('names the desk smell by its closest match', () => {
    expect(smellOf('cherry', DESK_START)).toBe('cherry');
    expect(smellOf('desk', DESK_START)).toBe('marzipan');
  });
});
