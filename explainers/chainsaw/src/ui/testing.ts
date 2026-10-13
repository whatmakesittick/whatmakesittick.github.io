import { initI18n } from '@core/i18n';
import en from '../../locales/en.json';

const STARTING_DRAFTS = {
  readouts: {
    engineState: {
      stopped: 'Stopped',
      cranking: 'Turning over',
      fastIdle: 'Fast idle',
      running: 'Idling',
    },
  },
  chapters: {
    starting: {
      steps: {
        ready: 'Cold and stopped',
        brake: 'Chain brake on',
        choke: 'Choke on',
        decompression: 'Decompression valve open',
        primer: 'Primer bulb pressed',
        firstPull: 'First pull',
        pop: 'A pop: it fires once',
        chokeOff: 'Choke off',
        secondPull: 'Second pull',
        fastIdle: 'Running at fast idle, brake on',
        idle: 'Throttle blipped, idling',
        done: 'Idling. Now release the brake.',
      },
    },
  },
};

type Dictionary = { [key: string]: string | Dictionary };

function isDictionary(value: unknown): value is Dictionary {
  return typeof value === 'object' && value !== null;
}

function merged(base: Dictionary, over: Dictionary): Dictionary {
  const result: Dictionary = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const current = result[key];
    result[key] = isDictionary(current) && isDictionary(value) ? merged(current, value) : value;
  }
  return result;
}

export const TEST_LOCALE = merged(STARTING_DRAFTS, en) as typeof en & typeof STARTING_DRAFTS;

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
  chips('start', ['cold']),
  readouts(['startStep', 'engineState']),
  throttleRange('clutch-throttle', ['clutchRpm', 'clutchState', 'clutchChain']),
  readouts(['idleRpm', 'engageRpm', 'perTurn', 'oil']),
  readouts(['chainSpeed', 'cuttersPerSecond']),
  chips('kickback', ['strong']),
  chips('brake', ['off', 'on']),
  readouts(['brakeState']),
].join('');
