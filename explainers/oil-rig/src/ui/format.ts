import { formatFixed, formatNumber } from '@core/format';
import { currentLanguage, t } from '@core/i18n';
import type { BitId, MudState } from '../ids';
import { phaseAt } from '../model';
import type { FlowState, PhaseId, RigTypeId } from '../model';

export const NO_VALUE = '–';

const PERCENT = 100;
const DENSITY_DIGITS = 2;
const TENTHS = 10;
const RIG_LIST_STYLE: Intl.ListFormatOptions = { type: 'conjunction', style: 'long' };

export const PHASE_KEYS: Record<PhaseId, string> = {
  deck: 'timeline.phase.deck',
  sea: 'timeline.phase.sea',
  topHole: 'timeline.phase.topHole',
  overburden: 'timeline.phase.overburden',
  seal: 'timeline.phase.seal',
  reservoir: 'timeline.phase.reservoir',
  bottom: 'timeline.phase.bottom',
};

export const JUMP_KEYS: Record<PhaseId, string> = {
  deck: 'timeline.jump.deck',
  sea: 'timeline.jump.sea',
  topHole: 'timeline.jump.topHole',
  overburden: 'timeline.jump.overburden',
  seal: 'timeline.jump.seal',
  reservoir: 'timeline.jump.reservoir',
  bottom: 'timeline.jump.bottom',
};

const DURING_KEYS: Record<PhaseId, string> = {
  deck: 'timeline.during.deck',
  sea: 'timeline.during.sea',
  topHole: 'timeline.during.topHole',
  overburden: 'timeline.during.overburden',
  seal: 'timeline.during.seal',
  reservoir: 'timeline.during.reservoir',
  bottom: 'timeline.during.bottom',
};

export const BIT_KEYS: Record<BitId, string> = {
  pdc: 'controls.bitOptions.pdc',
  rollerCone: 'controls.bitOptions.rollerCone',
};

const RIG_KEYS: Record<RigTypeId, string> = {
  jackUp: 'rigs.jackUp',
  jacket: 'rigs.jacket',
  tlp: 'rigs.tlp',
  spar: 'rigs.spar',
  semi: 'rigs.semi',
  drillship: 'rigs.drillship',
};

const MUD_STATE_KEYS: Record<MudState, string> = {
  safe: 'mud.state.safe',
  light: 'mud.state.light',
  heavy: 'mud.state.heavy',
};

const FLOW_STATE_KEYS: Record<FlowState, string> = {
  natural: 'flow.state.natural',
  assisted: 'flow.state.assisted',
};

const listFormats = new Map<string, Intl.ListFormat>();

function listFormat(): Intl.ListFormat {
  const language = currentLanguage();
  const cached = listFormats.get(language);
  if (cached) return cached;
  const format = new Intl.ListFormat(language, RIG_LIST_STYLE);
  listFormats.set(language, format);
  return format;
}

export function formatOptional<T>(value: T | null, format: (value: T) => string): string {
  return value === null ? NO_VALUE : format(value);
}

function toTenths(value: number): number {
  return Math.round(value * TENTHS) / TENTHS;
}

export function formatMetres(metres: number): string {
  return t('units.m', { value: formatFixed(Math.floor(metres), 0) });
}

export function formatMetresToTenths(metres: number): string {
  return t('units.m', { value: formatNumber(toTenths(metres)) });
}

export function describeDepth(metres: number): string {
  return t('timeline.value', {
    depth: formatMetres(metres),
    phase: t(DURING_KEYS[phaseAt(metres)]),
  });
}

export function formatSpeed(metresPerSecond: number): string {
  return t('units.metresPerSecond', { value: formatFixed(metresPerSecond, 0) });
}

export function describeSpeed(metresPerSecond: number): string {
  return t('timeline.speedValue', { value: formatFixed(metresPerSecond, 0) });
}

export function formatMillimetres(millimetres: number): string {
  return t('units.mm', { value: formatFixed(Math.round(millimetres), 0) });
}

export function formatBar(bar: number): string {
  return t('units.bar', { value: formatFixed(Math.round(bar), 0) });
}

export function formatCelsius(celsius: number): string {
  return t('units.celsius', { value: formatFixed(Math.round(celsius), 0) });
}

export function formatTonnes(tonnes: number, roundTo = 1): string {
  return t('units.tonnes', { value: formatFixed(Math.round(tonnes / roundTo) * roundTo, 0) });
}

export function formatPercent(share: number): string {
  return t('units.percent', { value: formatFixed(Math.round(share * PERCENT), 0) });
}

export function formatDensity(density: number): string {
  return t('units.density', { value: formatFixed(density, DENSITY_DIGITS) });
}

export function formatYear(years: number): string {
  return t('units.year', { value: formatFixed(years, 0) });
}

export function formatDay(day: number): string {
  return t('readouts.dayValue', { day: formatFixed(day, 0) });
}

export function formatRigs(rigs: readonly RigTypeId[]): string {
  return listFormat().format(rigs.map((rig) => t(RIG_KEYS[rig])));
}

export function formatMudState(state: MudState): string {
  return t(MUD_STATE_KEYS[state]);
}

export function formatFlowState(state: FlowState): string {
  return t(FLOW_STATE_KEYS[state]);
}
