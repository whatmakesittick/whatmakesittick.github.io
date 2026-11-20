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

function chapter(preset: string, body: readonly string[]): string {
  return `<section class="chapter" data-preset="${preset}">${body.join('')}</section>`;
}

export const CHAPTER_FIXTURE = [
  chapter('fan', [chips('streams', ['both', 'cold', 'hot'])]),
  chapter('compressor', [chips('cutaway', ['closed', 'cutaway'])]),
  chapter('combustor', [chips('cutaway', ['closed', 'cutaway'])]),
  chapter('turbines', [chips('cutaway', ['closed', 'cutaway']), readouts(['fanLive', 'coreLive'])]),
  chapter('thrust', [chips('streams', ['both', 'cold', 'hot'])]),
  chapter('reverse', [
    chips('look', ['starter', 'reverser']),
    chips('reverser', ['stowed', 'deployed']),
    readouts(['thrustLive']),
  ]),
].join('');
