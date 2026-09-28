import { describe, expect, it } from 'vitest';
import { translateHtml } from './translateHtml.ts';

const translations: Record<string, string> = {
  title: 'Fish & "chips" <b>',
  body: 'Hot <strong>and</strong> crisp',
  label: 'Menu "today"',
  hint: 'Pick one',
  nested: '<span data-i18n-attr="title:hint">Nested</span>',
  headline: '{{name}} · Menu',
};

const translate = (key: string, values: Record<string, string> = {}) =>
  (translations[key] ?? key).replace('{{name}}', values.name ?? '');

describe('translateHtml', () => {
  it('writes text keys as escaped text and keeps the marker', () => {
    expect(translateHtml('<h1 data-i18n="title">Old</h1>', translate)).toBe(
      '<h1 data-i18n="title">Fish &amp; &quot;chips&quot; &lt;b&gt;</h1>',
    );
  });

  it('fills the placeholders of a text key with the translation of other keys', () => {
    const html = '<title data-i18n="headline" data-i18n-values="name:label">Old</title>';
    expect(translateHtml(html, translate)).toBe(
      '<title data-i18n="headline" data-i18n-values="name:label">Menu &quot;today&quot; · Menu</title>',
    );
  });

  it('writes html keys as markup', () => {
    expect(translateHtml('<p data-i18n-html="body">Old</p>', translate)).toBe(
      '<p data-i18n-html="body">Hot <strong>and</strong> crisp</p>',
    );
  });

  it('writes every listed attribute and leaves the others alone', () => {
    const html = '<nav aria-label="Old" title="Old" data-i18n-attr="aria-label:label; title:hint">';
    expect(translateHtml(`${html}</nav>`, translate)).toBe(
      '<nav aria-label="Menu &quot;today&quot;" title="Pick one" data-i18n-attr="aria-label:label; title:hint"></nav>',
    );
  });

  it('translates attributes inside translated markup like the runtime does', () => {
    expect(translateHtml('<p data-i18n-html="nested"></p>', translate)).toContain(
      '<span data-i18n-attr="title:hint" title="Pick one">Nested</span>',
    );
  });

  it('keeps the doctype, comments, scripts and untranslated text', () => {
    const html =
      '<!doctype html>\n<html><!-- note --><script>if (a < b) run();</script><p>Кіт</p></html>';
    expect(translateHtml(html, translate)).toBe(html);
  });
});
