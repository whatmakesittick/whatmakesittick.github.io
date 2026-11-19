import { initI18n } from '@core/i18n';
import en from '../../locales/en.json';

export const TEST_LOCALE = en;

export function initTestLocale(): Promise<void> {
  return initI18n({ en: () => Promise.resolve(TEST_LOCALE) });
}

export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '');
}

const PLACEHOLDER = /\{\{|\}\}/;

export function isFilled(text: string | null | undefined): boolean {
  return Boolean(text) && !PLACEHOLDER.test(text ?? '');
}

function readouts(ids: readonly string[]): string {
  const rows = ids.map(
    (id) => `<div><dt>${id}</dt><dd class="number" data-readout="${id}"></dd></div>`,
  );
  return `<dl class="readouts">${rows.join('')}</dl>`;
}

function chips(action: string, values: readonly string[]): string {
  const buttons = values.map(
    (value) =>
      `<button type="button" class="chip" data-action="${action}" data-value="${value}">${value}</button>`,
  );
  return `<div class="chip-row" role="group">${buttons.join('')}</div>`;
}

function range(id: string, control: string): string {
  return `<div class="range-widget"><div class="range-widget__header"><label for="${id}">${control}</label><output class="number" for="${id}"></output></div><input id="${id}" type="range" class="range" data-control="${control}" /></div>`;
}

function chapter(preset: string, body: readonly string[]): string {
  return `<section class="chapter" data-preset="${preset}">${body.join('')}</section>`;
}

const ODORANTS = ['benzaldehyde', 'hexenal', 'linalool', 'eugenol', 'ionone'];

export const CHAPTER_FIXTURE = [
  chapter('tongue', [
    chips('scale', ['head', 'tongue', 'molecules']),
    readouts(['tongueTemp', 'tongueSweet', 'tongueSour', 'tongueCold']),
  ]),
  chapter('routes', [
    chips('nose', ['open', 'pinched']),
    readouts(['routesOrtho', 'routesRetro', 'routesNotice']),
  ]),
  chapter('receptors', [
    chips('sniff', ['mix', ...ODORANTS]),
    readouts(['receptorsFiring', 'receptorsSniffed']),
  ]),
  chapter('cherry', [
    chips('food', ['cherry', 'sweets', 'marzipan']),
    readouts(['cherryMain', 'cherryShare']),
  ]),
  chapter('desk', [
    chips('recipe', ['fruit', 'sweets', 'clear']),
    ...ODORANTS.map((id) => range(`desk-${id}`, id)),
    readouts(['deskSmell', 'deskMatch', 'deskDrops']),
  ]),
  chapter('iceCream', [
    range('ice-serving', 'serving'),
    range('ice-fat', 'fat'),
    readouts(['iceReleased', 'icePeak', 'iceMelted']),
  ]),
].join('');
