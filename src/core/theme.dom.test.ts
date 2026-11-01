import { afterEach, describe, expect, it } from 'vitest';
import { activeScheme } from './theme';

describe('activeScheme', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('reads the scheme the head script set on the root', () => {
    document.documentElement.dataset.theme = 'light';
    expect(activeScheme()).toBe('light');
  });

  it.each([undefined, 'sepia'])('falls back to dark for %s', (theme) => {
    if (theme !== undefined) document.documentElement.dataset.theme = theme;
    expect(activeScheme()).toBe('dark');
  });
});
