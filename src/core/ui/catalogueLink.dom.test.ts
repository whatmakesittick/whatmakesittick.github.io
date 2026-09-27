import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '../i18n';
import { mountCatalogueLinks } from './catalogueLink';

function hrefs(): (string | null)[] {
  return [...document.querySelectorAll('[data-catalogue-link]')].map((link) =>
    link.getAttribute('href'),
  );
}

describe('catalogue links', () => {
  beforeAll(async () => {
    window.history.replaceState(null, '', '/glider/?lang=de');
    document.body.innerHTML = '<a data-catalogue-link href="/">Site</a><a data-catalogue-link></a>';
    await initI18n();
    mountCatalogueLinks(document);
  });

  it('keeps an English page translated by the query on the English catalogue', () => {
    expect(hrefs()).toEqual(['/?lang=de', '/?lang=de']);
  });
});
