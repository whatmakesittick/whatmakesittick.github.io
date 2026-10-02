import { formatFixed, formatNumber, formatSignificant } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from '../ids';
import type {
  BatteryReading,
  FlightModeId,
  MotorShares,
  MoveId,
  PhaseId,
  SpeedsterId,
  VideoId,
} from '../ids';
import {
  DEFAULT_MAX_RATE_DEG_S,
  FLIGHT_MODES,
  MOTOR_MIXES,
  SPEEDSTERS,
  clockAt,
  hoverSpeedShare,
  hoverThrustShare,
  phaseAt,
  signalGradeOf,
} from '../model';

const WHOLE = 0;
const TENTHS = 1;
const HUNDREDTHS = 2;
const SHORT_DIGITS = 2;
const PERCENT = 100;
const CLOCK_DIGITS = 2;
const CLOCK_PAD = '0';
const CLOCK_SEPARATOR = ':';
const MINUS_SIGN = '−';

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
  return formatFixed(value, WHOLE);
}

function tenths(value: number): string {
  return formatFixed(value, TENTHS);
}

function percent(share: number): string {
  return whole(share * PERCENT);
}

function signedWhole(value: number): string {
  const rounded = Math.round(value);
  return rounded < 0 ? `${MINUS_SIGN}${whole(-rounded)}` : whole(rounded);
}

export function formatClock(seconds: number): string {
  const clock = clockAt(seconds);
  const padded = String(clock.seconds).padStart(CLOCK_DIGITS, CLOCK_PAD);
  return t('timeline.clock', { clock: `${clock.minutes}${CLOCK_SEPARATOR}${padded}` });
}

export function formatPhase(seconds: number): string {
  return formatClock(seconds);
}

export function describePhase(seconds: number): string {
  return t('timeline.value', {
    time: formatPhase(seconds),
    phase: t(DURING_KEYS[phaseAt(seconds)]),
  });
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedFormat', { factor: formatNumber(speed) });
}

export function describeSpeed(): string {
  return t('timeline.speedValue');
}

export function formatKmh(kmh: number): string {
  return t('units.kmh', { value: whole(kmh) });
}

export function formatMetres(metres: number): string {
  return t('units.m', { value: whole(metres) });
}

export function formatGrams(grams: number): string {
  return t('units.g', { value: whole(grams) });
}

export function formatPercent(share: number): string {
  return t('units.percent', { value: percent(share) });
}

export function formatOfHover(share: number): string {
  return t('units.ofHover', { percent: percent(share) });
}

export function formatVolts(volts: number): string {
  return t('units.volts', { value: tenths(volts) });
}

export function formatAmps(amps: number): string {
  return t('units.amps', { value: tenths(amps) });
}

export function formatBattery({ volts, share }: BatteryReading): string {
  return t('units.battery', { volts: tenths(volts), share: percent(share) });
}

export function formatMilliseconds(ms: number): string {
  return t('units.ms', { value: formatSignificant(ms, SHORT_DIGITS) });
}

export function formatDbm(dbm: number): string {
  return t('units.dbm', { value: signedWhole(dbm) });
}

export function formatMinutes(minutes: number): string {
  return t('units.minutes', { value: tenths(minutes) });
}

export function formatSeconds(seconds: number): string {
  return t('units.seconds', { value: formatSignificant(seconds, SHORT_DIGITS) });
}

export function formatDegrees(degrees: number): string {
  return t('units.degrees', { value: whole(degrees) });
}

export function formatPush(metresPerSecondSquared: number, gForce: number): string {
  return t('units.push', {
    ms2: tenths(metresPerSecondSquared),
    g: formatFixed(gForce, HUNDREDTHS),
  });
}

export function formatTimes(factor: number): string {
  return t('units.times', { factor: formatSignificant(factor, SHORT_DIGITS) });
}

export function formatRatio(ratio: number): string {
  return t('units.ratio', { ratio: tenths(ratio) });
}

export function formatHoverThrottle(payloadG: number): string {
  return t('units.hover', {
    thrust: percent(hoverThrustShare(payloadG)),
    speed: percent(hoverSpeedShare(payloadG)),
  });
}

function mixValues([m1, m2, m3, m4]: MotorShares): Record<string, string> {
  return { m1: percent(m1), m2: percent(m2), m3: percent(m3), m4: percent(m4) };
}

export function formatMix(move: MoveId): string {
  return t(`flight.mix.${move}`, mixValues(MOTOR_MIXES[move]));
}

export function formatWhy(move: MoveId): string {
  return t(`flight.why.${move}`);
}

export function formatStick(mode: FlightModeId): string {
  return t(FLIGHT_MODES[mode].stickKey);
}

export function formatLimit(mode: FlightModeId): string {
  return t(FLIGHT_MODES[mode].limitKey, { rate: formatNumber(DEFAULT_MAX_RATE_DEG_S) });
}

export function formatLatency(video: VideoId): string {
  return t(`link.latency.${video}`);
}

export function formatPicture(video: VideoId): string {
  return t(`link.picture.${video}`);
}

export function formatSignal(share: number): string {
  return t(`link.signal.${signalGradeOf(share)}`);
}

export function formatWho(speedster: SpeedsterId): string {
  return t(SPEEDSTERS[speedster].whoKey);
}
