import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../i18n';
import { mountSiteLinks } from './siteLinks';

function hrefs(selector: string): (string | null)[] {
  return [...document.querySelectorAll(selector)].map((link) => link.getAttribute('href'));
}

describe('site links', () => {
  beforeAll(async () => {
    window.history.replaceState(null, '', '/glider/?lang=de');
    document.body.innerHTML = [
      '<a data-catalogue-link href="/">Site</a><a data-catalogue-link></a>',
      '<a data-about-link href="/about/">About</a>',
    ].join('');
    await initI18n();
    mountSiteLinks(document);
  });

  it('keeps an English page translated by the query on the English catalogue', () => {
    expect(hrefs('[data-catalogue-link]')).toEqual(['/?lang=de', '/?lang=de']);
  });

  it('points the about link at the English about page with the same query', () => {
    expect(hrefs('[data-about-link]')).toEqual(['/about/?lang=de']);
  });
});
