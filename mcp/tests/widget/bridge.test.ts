import { describe, expect, it } from 'vitest';
import { toDisplayMode } from '../../widget/src/bridge.ts';

describe('toDisplayMode', () => {
  it('accepts the modes the widget supports', () => {
    expect(toDisplayMode('inline')).toBe('inline');
    expect(toDisplayMode('fullscreen')).toBe('fullscreen');
  });

  it.each(['pip', '', 'Inline', 3, null, undefined, {}])('rejects %j', (value) => {
    expect(toDisplayMode(value)).toBeUndefined();
  });
});
