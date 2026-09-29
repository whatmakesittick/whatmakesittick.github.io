import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { slowMotionFactor } from '@core/playback';
import { PHASE_IDS } from '../ids';
import type { PhaseId, PropellantId } from '../ids';
import { REAL_TIME_SPEED, playbackFactor } from '../model/playback';
import { phaseIdAt } from '../model/phases';
import { flightTime } from '../model';
import type { CycleId, PropellantPair } from '../model/engines';
import type { PlumeReading } from '../state/derived';

export type CycleBox =
  | 'tank'
  | 'pump'
  | 'boostPump'
  | 'burner'
  | 'preburner'
  | 'gasGenerator'
  | 'turbine'
  | 'chamber'
  | 'nozzle'
  | 'overboard'
  | 'oxygen'
  | 'fuel';

const SECONDS_PER_MINUTE = 60;
const CLOCK_DIGITS = 2;
const CLOCK_PAD = '0';
const TENTHS = 1;
const HUNDREDTHS = 2;
const PERCENT = 100;
const SMALL_BAR = 0.01;
const SIGNIFICANT_DIGITS = 3;
const REAL_TIME_FORMAT = '1×';
const SLOWER_PREFIX = '1/';
const TIMES_SUFFIX = '×';

function phaseKeys(group: string): Readonly<Record<PhaseId, string>> {
  return Object.fromEntries(PHASE_IDS.map((id) => [id, `timeline.${group}.${id}`])) as Record<
    PhaseId,
    string
  >;
}

export const PHASE_KEYS = phaseKeys('phase');
export const JUMP_KEYS = phaseKeys('jump');
const DURING_KEYS = phaseKeys('during');

function whole(value: number): string {
  return formatFixed(value, 0);
}

function clockSeconds(seconds: number): string {
  return String(seconds).padStart(CLOCK_DIGITS, CLOCK_PAD);
}

export function formatFlightTime(time: number): string {
  if (time < 0) return t('timeline.before', { seconds: formatFixed(-time, TENTHS) });
  const elapsed = Math.floor(time);
  return t('timeline.after', {
    minutes: Math.floor(elapsed / SECONDS_PER_MINUTE),
    seconds: clockSeconds(elapsed % SECONDS_PER_MINUTE),
  });
}

export function formatPhase(phase: number): string {
  return formatFlightTime(flightTime(phase));
}

export function describePhase(phase: number): string {
  return t('timeline.value', {
    time: formatPhase(phase),
    phase: t(DURING_KEYS[phaseIdAt(phase)]),
  });
}

export function formatSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return REAL_TIME_FORMAT;
  if (speed < REAL_TIME_SPEED) {
    return `${SLOWER_PREFIX}${formatNumber(slowMotionFactor(speed, REAL_TIME_SPEED))}${TIMES_SUFFIX}`;
  }
  return `${formatNumber(playbackFactor(speed))}${TIMES_SUFFIX}`;
}

export function describeSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return t('timeline.realTime');
  if (speed < REAL_TIME_SPEED) {
    return t('timeline.slower', {
      factor: formatNumber(slowMotionFactor(speed, REAL_TIME_SPEED)),
    });
  }
  return t('timeline.faster', { factor: formatNumber(playbackFactor(speed)) });
}

export function formatTonnes(tonnes: number): string {
  return t('units.tonnes', { value: whole(tonnes) });
}

export function formatSeconds(seconds: number): string {
  return t('units.seconds', { value: whole(seconds) });
}

function barDigits(bar: number): number {
  if (bar >= SMALL_BAR || bar <= 0) return HUNDREDTHS;
  return SIGNIFICANT_DIGITS - 1 - Math.floor(Math.log10(bar));
}

export function formatBar(bar: number): string {
  return t('units.bar', { value: formatFixed(bar, barDigits(bar)) });
}

export function formatAboutBar(bar: number): string {
  return t('units.barAbout', { value: whole(bar) });
}

export function formatExactBar(bar: number): string {
  return t('units.bar', { value: whole(bar) });
}

export function formatKm(km: number, digits: number = TENTHS): string {
  return t('units.km', { value: formatFixed(km, digits) });
}

export function formatKmPerHour(kmPerHour: number): string {
  return t('units.kmPerHour', { value: whole(kmPerHour) });
}

export function formatKmPerSecond(kmPerSecond: number): string {
  return t('units.kmPerSecond', { value: formatFixed(kmPerSecond, TENTHS) });
}

export function formatKgPerSecond(kgPerSecond: number): string {
  return t('units.kgPerSecond', { value: whole(kgPerSecond) });
}

export function formatKg(kg: number): string {
  return t('units.kg', { value: whole(kg) });
}

export function formatKelvinCelsius(kelvin: number, celsius: number): string {
  return t('units.kelvinCelsius', { kelvin: whole(kelvin), celsius: whole(celsius) });
}

export function formatAboutKelvin(kelvin: number): string {
  return t('units.kelvinAbout', { value: formatNumber(kelvin) });
}

export function formatPercent(share: number): string {
  return t('units.percent', { value: whole(share * PERCENT) });
}

export function formatDegrees(degrees: number): string {
  return t('units.degrees', { value: formatFixed(degrees, TENTHS) });
}

export function formatTimes(times: number): string {
  return t('units.times', { value: whole(times) });
}

export function formatOff(): string {
  return t('units.off');
}

export function formatPlume(reading: PlumeReading): string {
  return t(`plume.${reading}`);
}

export function formatRoute(propellant: PropellantId): string {
  return t(`propellants.route.${propellant}`);
}

export function formatCycle(cycle: CycleId): string {
  return t(`engines.cycle.${cycle}`);
}

export function formatPropellantPair(pair: PropellantPair): string {
  return t(`engines.propellants.${pair}`);
}

export function formatDumps(dumps: boolean): string {
  return t(dumps ? 'engines.dumps.yes' : 'engines.dumps.no');
}

export function formatCycleBox(box: CycleBox): string {
  return t(`cycle.${box}`);
}
