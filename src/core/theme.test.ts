import { describe, expect, it } from 'vitest';
import { SCHEMES, THEME, activeScheme } from './theme';

describe('activeScheme without a document', () => {
  it('resolves to dark', () => {
    expect(activeScheme()).toBe('dark');
    expect(THEME).toBe(SCHEMES.dark);
  });
});
