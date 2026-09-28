import { describe, expect, it } from 'vitest';
import { formatAttributeKeys, parseAttributeKeys } from './markup';

describe('parseAttributeKeys', () => {
  it('reads attribute and key pairs and skips incomplete ones', () => {
    expect(parseAttributeKeys('aria-label:controls.label; title : controls.hint;;alt:')).toEqual([
      ['aria-label', 'controls.label'],
      ['title', 'controls.hint'],
    ]);
  });
});

describe('formatAttributeKeys', () => {
  it('writes pairs that parse back to the same pairs', () => {
    const pairs = [
      ['aria-label', 'stage.expand'],
      ['title', 'stage.expand'],
    ] as const;
    expect(formatAttributeKeys(pairs)).toBe('aria-label:stage.expand;title:stage.expand');
    expect(parseAttributeKeys(formatAttributeKeys(pairs))).toEqual(pairs);
  });
});
