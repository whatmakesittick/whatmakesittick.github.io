import { describe, expect, it } from 'vitest';
import { parseAttributeKeys } from './markup';

describe('parseAttributeKeys', () => {
  it('reads attribute and key pairs and skips incomplete ones', () => {
    expect(parseAttributeKeys('aria-label:controls.label; title : controls.hint;;alt:')).toEqual([
      ['aria-label', 'controls.label'],
      ['title', 'controls.hint'],
    ]);
  });
});
