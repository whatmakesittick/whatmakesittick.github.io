import { DEFAULT_LANGUAGE, currentLanguage, onLanguageChanged, t } from '@core/i18n';
import type { LanguageCode } from '@core/i18n';
import { languagePath } from '@core/i18n/paths';
import { html, requireElement, svg } from '@core/ui/dom';
import { localizedMeta, pageLanguage } from './catalogue';
import type { CatalogueEntry } from '@core/manifest';

const ARROW_PATH = 'M5 12h14M13 6l6 6-6 6';
const ICON_VIEW_BOX = '0 0 24 24';

function explainerPath(entry: CatalogueEntry, file = ''): string {
  return `${import.meta.env.BASE_URL}${entry.manifest.slug}/${file}`;
}

function explainerPage(entry: CatalogueEntry, code: LanguageCode): string {
  const language = pageLanguage(entry, code, DEFAULT_LANGUAGE);
  return `${import.meta.env.BASE_URL}${languagePath(language, entry.manifest.slug)}`;
}

function arrowIcon(): SVGSVGElement {
  return svg('svg', { class: 'icon', viewBox: ICON_VIEW_BOX, 'aria-hidden': 'true' }, [
    svg('path', { d: ARROW_PATH }),
  ]);
}

function createCard(entry: CatalogueEntry): HTMLElement | undefined {
  const code = currentLanguage();
  const meta = localizedMeta(entry, code, DEFAULT_LANGUAGE);
  if (!meta) return undefined;
  const cover = html('img', {
    src: explainerPath(entry, entry.manifest.cover),
    alt: meta.title,
    loading: 'lazy',
    decoding: 'async',
  });
  return html('li', {}, [
    html('a', { class: 'card', href: explainerPage(entry, code) }, [
      html('span', { class: 'card-cover' }, [cover]),
      html('span', { class: 'card-body' }, [
        html('span', { class: 'card-eyebrow' }, [meta.eyebrow]),
        html('h2', { class: 'card-title' }, [meta.title]),
        html('span', { class: 'card-summary' }, [meta.summary]),
        html('span', { class: 'card-action' }, [t('catalogue.explore'), arrowIcon()]),
      ]),
    ]),
  ]);
}

function createPlaceholder(): HTMLElement {
  return html('li', { class: 'card-placeholder' }, [t('catalogue.moreSoon')]);
}

function createGrid(entries: readonly CatalogueEntry[]): HTMLElement {
  const cards = entries.map(createCard).filter((card) => card !== undefined);
  return html('ul', { class: 'cards' }, [...cards, createPlaceholder()]);
}

export function mountCards(root: Document, entries: readonly CatalogueEntry[]): void {
  const container = requireElement(root, '[data-catalogue]');
  const render = () => container.replaceChildren(createGrid(entries));
  render();
  onLanguageChanged(render);
}
