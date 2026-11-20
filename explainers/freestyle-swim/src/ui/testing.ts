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

const RANGE_WIDGET =
  '<div class="range-widget"><div class="range-widget__header"><label for="drag-speed">speed</label><output class="number" for="drag-speed"></output></div><input id="drag-speed" type="range" class="range" data-control="whatIfSpeed" /></div>';

function chapter(preset: string, body: readonly string[]): string {
  return `<section class="chapter" data-preset="${preset}">${body.join('')}</section>`;
}

export const CHAPTER_FIXTURE = [
  chapter('stroke', [
    chips('pace', ['easy', 'middle', 'sprint']),
    readouts(['strokeSpeed', 'strokeRate', 'strokeLength', 'strokeSum', 'strokePhase']),
  ]),
  chapter('catch', [readouts(['catchElbow', 'catchDepth', 'catchPhase'])]),
  chapter('pull', [readouts(['pullForce', 'pullHandSpeed', 'pullPhase'])]),
  chapter('roll', [
    chips('breath', ['none', 'right']),
    readouts(['rollShoulder', 'rollHip', 'rollSide', 'rollBreath']),
  ]),
  chapter('kick', [
    chips('kick', ['two', 'six']),
    readouts(['kickPattern', 'kickBeats', 'kickLeg']),
  ]),
  chapter('drag', [
    chips('head', ['down', 'up']),
    RANGE_WIDGET,
    readouts(['dragNow', 'dragAt', 'powerAt', 'gapNow', 'gapEasy', 'gapMiddle', 'gapSprint']),
  ]),
].join('');
