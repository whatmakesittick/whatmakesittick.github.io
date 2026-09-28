import { describe, expect, it } from 'vitest';
import { element, escapeHtml } from './html';

describe('escapeHtml', () => {
  it('escapes the characters that break text and attribute values', () => {
    expect(escapeHtml('Tom & "Jerry" <3>')).toBe('Tom &amp; &quot;Jerry&quot; &lt;3&gt;');
  });
});

describe('element', () => {
  it('renders attributes, escaped text and nested markup', () => {
    const link = element('a', { href: '/?a=1&b=2', class: 'card' }, [
      element('span', {}, ['<b>']),
      ' & more',
    ]);
    expect(link.html).toBe(
      '<a href="/?a=1&amp;b=2" class="card"><span>&lt;b&gt;</span> &amp; more</a>',
    );
  });

  it('writes true as a bare attribute and leaves out false and undefined', () => {
    const button = element('button', {
      disabled: true,
      hidden: false,
      title: undefined,
      tabindex: 0,
    });
    expect(button.html).toBe('<button disabled tabindex="0"></button>');
  });

  it('closes no void element', () => {
    expect(element('img', { src: 'cover.webp', alt: '' }).html).toBe(
      '<img src="cover.webp" alt="">',
    );
  });
});
