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

function throttleRange(id: string, ids: readonly string[]): string {
  return `<div class="range-widget"><div class="range-widget__header"><label for="${id}">Throttle</label><output class="number" for="${id}"></output></div><input id="${id}" type="range" class="range" data-control="throttle" />${readouts(ids)}</div>`;
}

export const CHAPTER_FIXTURE = [
  throttleRange('saw-throttle', ['sawRpm', 'sawChain']),
  readouts(['turnTime', 'strokes', 'phaseNow']),
  chips('throttle', ['idle', 'half', 'full']),
  readouts(['throttleOpen', 'crankcase']),
  throttleRange('clutch-throttle', ['clutchRpm', 'clutchState', 'clutchChain']),
  readouts(['idleRpm', 'engageRpm', 'perTurn', 'oil']),
  readouts(['chainSpeed', 'cuttersPerSecond']),
  chips('kickback', ['strong']),
  chips('brake', ['off', 'on']),
  readouts(['brakeState']),
].join('');
