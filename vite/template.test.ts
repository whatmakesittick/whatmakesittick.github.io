import { describe, expect, it } from 'vitest';
import { escapeHtml, expandPartials, fillTemplate } from './template.ts';

describe('template', () => {
  it('escapes text for attributes and element content', () => {
    expect(escapeHtml('Fish & "chips" <b>')).toBe('Fish &amp; &quot;chips&quot; &lt;b&gt;');
  });

  it('indents partials and block tokens to their placeholder', () => {
    const html =
      '<body>\n  <!-- partial:footer -->\n  <main>\n    {{chapters}}\n  </main>\n</body>';
    const expanded = expandPartials(html, { footer: '<footer>\n  {{year}}\n</footer>\n' });
    expect(fillTemplate(expanded, { chapters: '<p>one</p>\n\n<p>two</p>', year: '2026' })).toBe(
      '<body>\n  <footer>\n    2026\n  </footer>\n  <main>\n    <p>one</p>\n\n    <p>two</p>\n  </main>\n</body>',
    );
  });

  it('fills inline tokens without scanning the inserted text again', () => {
    expect(fillTemplate('<title>{{title}}</title>', { title: '{{title}}' })).toBe(
      '<title>{{title}}</title>',
    );
  });

  it('rejects unknown tokens and partials', () => {
    expect(() => fillTemplate('{{missing}}', {})).toThrow('Unknown token "missing"');
    expect(() => expandPartials('<!-- partial:missing -->', {})).toThrow('Unknown partial');
  });
});
