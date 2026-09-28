import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../i18n';
import { mountFooter } from './footer';

function click(selector: string): void {
  const link = document.querySelector(selector);
  if (!link) throw new Error(`No link ${selector}`);
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

describe('footer', () => {
  beforeAll(async () => {
    window.history.replaceState(null, '', '/uk/lock/');
    document.body.innerHTML = [
      '<footer>',
      '<nav data-language-links>',
      '<a href="/lock/" hreflang="en" lang="en">English</a>',
      '<a href="/uk/lock/" hreflang="uk" lang="uk" aria-current="page">Українська</a>',
      '</nav>',
      '<p data-copyright></p>',
      '</footer>',
    ].join('');
    document.addEventListener('click', (event) => event.preventDefault());
    await initI18n({ en: () => Promise.resolve({ meta: { title: 'Lock' } }) });
    mountFooter(document, 'meta.title');
  });

  it('writes the copyright with the page title', () => {
    expect(document.querySelector('[data-copyright]')?.textContent).toContain('Lock');
  });

  it('remembers the language of a language link the reader follows', () => {
    click('a[hreflang="en"]');
    expect(window.localStorage.getItem('language')).toBe('en');
    click('a[hreflang="uk"]');
    expect(window.localStorage.getItem('language')).toBe('uk');
  });
});
