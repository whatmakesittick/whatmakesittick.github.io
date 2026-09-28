import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage } from './index';
import { translateDom } from './dom';

const english = { page: { metaTitle: '{{title}} · Site' }, meta: { title: 'How a lock works' } };
const ukrainian = { page: { metaTitle: '{{title}} · Сайт' }, meta: { title: 'Як працює замок' } };

describe('translateDom', () => {
  beforeAll(async () => {
    window.history.replaceState(null, '', '/lock/');
    document.head.innerHTML =
      '<title data-i18n="page.metaTitle" data-i18n-values="title:meta.title">Old</title>';
    document.body.innerHTML = '<h1 data-i18n="meta.title">Old</h1>';
    await initI18n({ en: () => Promise.resolve(english), uk: () => Promise.resolve(ukrainian) });
  });

  it('composes the document title from the keys it names', () => {
    translateDom(document);
    expect(document.title).toBe('How a lock works · Site');
    expect(document.querySelector('h1')?.textContent).toBe('How a lock works');
  });

  it('composes the title again in a new language', async () => {
    await setLanguage('uk');
    translateDom(document);
    expect(document.title).toBe('Як працює замок · Сайт');
  });
});
