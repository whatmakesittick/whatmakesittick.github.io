import { initI18n } from '@core/i18n';

export const TEST_LOCALE = {
  readouts: {
    wind: 'Wind',
    power: 'Power',
    farm: 'Farm',
    state: {
      idle: 'Waiting',
      partial: 'Catching wind',
      full: 'Full power',
      rampDown: 'Easing off',
      stopping: 'Stopping',
      parked: 'Parked',
      starting: 'Starting',
    },
  },
  units: {
    metresPerSecond: '{{value}} m/s',
    speedPair: '{{ms}} m/s ({{kmh}} km/h)',
    rpm: '{{value}} rpm',
    degrees: '{{value}}°',
    mw: '{{value}} MW',
    mwh: '{{value}} MWh',
    percent: '{{value}} %',
    metres: '{{value}} m',
    seconds: '{{value}} s',
    count: '{{value}}',
    hectares: '{{value}} ha',
    squareKm: '{{value}} km²',
    volts: '{{value}} V',
    gramsPerKwh: '{{value}} g/kWh',
    months: '{{value}} months',
  },
  chapters: {
    farm: { spacingValue: '{{metres}} m ({{diameters}} D)' },
    tower: { stopped: 'Not turning', sweptValue: '{{area}} m² ({{pitches}} pitches)' },
    nacelle: {
      gearValue: 'about 1 to {{ratio}}',
      brakeValue: { released: 'Released', holding: 'Holding' },
    },
    curve: {
      axisWind: 'Wind speed (m/s)',
      axisPower: 'Power (MW)',
      lineWind: 'Power in the wind',
      lineBetz: 'Betz limit',
      lineTurbine: 'This turbine',
      caption: 'Power in the wind, the Betz limit and this turbine',
    },
    grid: { voltagesValue: '{{generator}} V, {{collector}} kV, {{grid}} kV' },
  },
};

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

function windRange(id: string): string {
  return `<div class="range-widget"><div class="range-widget__header"><label for="${id}">Wind</label><output class="number" for="${id}"></output></div><input id="${id}" type="range" class="range" data-control="wind-override" /></div>`;
}

export const CHAPTER_FIXTURE = [
  readouts([
    'turbineCount',
    'farmRated',
    'rowSpacing',
    'acrossSpacing',
    'builtLand',
    'projectArea',
  ]),
  windRange('tower-wind'),
  readouts(['rotorRpm', 'turnTime']),
  chips('windAt', ['day', 'rated']),
  readouts(['tipSpeed', 'tipHeight', 'bladeLength', 'sweptArea']),
  chips('nacelle', ['closed', 'open']),
  readouts(['shaftRpm', 'generatorRpm', 'gearRatio', 'pitchAngle', 'brake', 'generatorVolts']),
  windRange('curve-wind'),
  readouts(['operatingState', 'curvePower']),
  chips('windAt', ['day', 'cutIn', 'peak', 'rated', 'rampDown', 'cutOut']),
  '<figure class="curve-widget" data-widget="power-curve"><canvas data-canvas="power-curve"></canvas></figure>',
  readouts(['windPower', 'powerCoefficient', 'betzShare', 'curvePitch']),
  chips('spacing', ['5', '7', '9']),
  readouts(['wakeSpacing', 'wakeDeficit', 'wakeLoss', 'windTop', 'windBottom']),
  chips('siteWind', ['calm', 'typical', 'windy']),
  readouts([
    'farmOutput',
    'energyToday',
    'homes',
    'capacityFactor',
    'voltages',
    'annualEnergy',
    'annualHomes',
    'carbon',
    'payback',
  ]),
].join('');
