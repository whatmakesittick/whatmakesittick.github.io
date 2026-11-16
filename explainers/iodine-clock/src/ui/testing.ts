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

export function steps(ids: readonly string[]): string {
  const rows = ids.map(
    (id) =>
      `<li data-step="${id}"><span class="step-list__name">${id}</span><span class="step-list__state" data-step-state>Running</span></li>`,
  );
  return `<ol class="step-list" data-steps>${rows.join('')}</ol>`;
}

function chips(action: string, values: readonly string[]): string {
  const buttons = values.map(
    (value) =>
      `<button type="button" class="chip" data-action="${action}" data-value="${value}">${value}</button>`,
  );
  return `<div class="chip-row" role="group">${buttons.join('')}</div>`;
}

export const GRAPH =
  '<figure class="clock-graph" data-graph="clock"><canvas class="clock-graph__canvas"></canvas></figure>';

function range(id: string, control: string): string {
  return `<div class="range-widget"><div class="range-widget__header"><label for="${id}">${control}</label><output class="number" for="${id}"></output></div><input id="${id}" type="range" class="range" data-control="${control}" /></div>`;
}

function chapter(preset: string, body: readonly string[]): string {
  return `<section class="chapter" data-preset="${preset}">${body.join('')}</section>`;
}

export const CHAPTER_FIXTURE = [
  chapter('pour', [chips('scale', ['beaker', 'molecules']), readouts(['pourClock'])]),
  chapter('slowStep', [steps(['landolt']), readouts(['bisulfiteLeft', 'iodideMade', 'acidMade'])]),
  chapter('invisibleIodine', [
    steps(['landolt', 'dushman', 'eaten']),
    readouts(['iodineLifetime']),
  ]),
  chapter('tippingPoint', [
    chips('scale', ['beaker', 'molecules']),
    GRAPH,
    readouts(['switchAt', 'bisulfiteNow', 'iodineNow', 'pace']),
  ]),
  chapter('starch', [steps(['triiodide', 'helix']), readouts(['helixFill'])]),
  chapter('tuning', [
    range('tuning-iodate', 'iodate'),
    range('tuning-temperature', 'temperature'),
    chips('mix', ['again']),
    GRAPH,
    readouts(['tuningSwitch', 'tuningRatio']),
  ]),
].join('');
