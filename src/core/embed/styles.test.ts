import { describe, expect, it } from 'vitest';
import { scopedControlsCss } from './styles';

const css = {
  tokens: ':root{--accent:#f5a524}:root:lang(zh){--font-sans:serif}',
  primitives: '.icon{width:18px}',
  controls: '.dock{display:grid}',
  compact: '.dock{gap:8px}',
  touch: '.range{height:44px}',
};

describe('scopedControlsCss', () => {
  it('scopes the tokens and the controls to the slot', () => {
    expect(scopedControlsCss('[ui]', css)).toBe(
      '[ui]{&{--accent:#f5a524}&:lang(zh){--font-sans:serif}.icon{width:18px}.dock{display:grid}' +
        '@container (max-width: 620px){.gauge{display:none}}' +
        '@container embed-dock (max-width: 459px){.dock{gap:8px}}' +
        '@media (pointer: coarse){.range{height:44px}}}',
    );
  });
});
