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

function rangeWidget(id: string): string {
  return `<div class="range-widget"><div class="range-widget__header"><label for="${id}">rate</label><output class="number" for="${id}"></output></div><input id="${id}" type="range" class="range" data-control="stepRate" /></div>`;
}

function chapter(preset: string, body: readonly string[]): string {
  return `<section class="chapter" data-preset="${preset}">${body.join('')}</section>`;
}

export const CHAPTER_FIXTURE = [
  chapter('stride', [
    chips('pace', ['easy', 'steady', 'fast']),
    readouts([
      'strideSpeed',
      'strideCadence',
      'strideStep',
      'strideSum',
      'stridePhase',
      'strideFloat',
    ]),
  ]),
  chapter('touchdown', [
    rangeWidget('land-step-rate'),
    readouts([
      'landRate',
      'landCadence',
      'landStep',
      'landReach',
      'landKnee',
      'landBrake',
      'landBrakeImpulse',
    ]),
  ]),
  chapter('spring', [
    readouts(['springForce', 'springKnee', 'springPeak', 'springContact', 'springPhase']),
  ]),
  chapter('liftoff', [
    rangeWidget('lift-step-rate'),
    readouts(['liftRate', 'liftBounce', 'liftFlight', 'liftHip', 'liftCadence', 'liftStep']),
  ]),
  chapter('posture', [
    chips('arms', ['swing', 'held']),
    chips('look', ['front', 'above']),
    readouts(['postureLean', 'postureTwist', 'postureElbow', 'postureArm', 'postureArms']),
  ]),
  chapter('pace', [
    chips('pace', ['easy', 'steady', 'fast']),
    readouts([
      'paceSpeed',
      'paceKm',
      'paceCadence',
      'paceStep',
      'paceContact',
      'paceFloat',
      'paceKnee',
      'paceForce',
      'paceLean',
    ]),
  ]),
].join('');
