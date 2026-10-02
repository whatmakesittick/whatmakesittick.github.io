import { formatFixed, formatNumber, formatSignificant } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from '../ids';
import type {
  ComparisonId,
  LinkMode,
  MissileStage,
  PhaseId,
  SensorModeId,
  SensorReading,
} from '../ids';
import {
  COMPARED_FIGURES,
  HOP_EARTH_GIRTHS,
  HOP_S,
  REAPER_FIGURES,
  ROUND_TRIP_S,
  clockAt,
  hoursAndMinutes,
  metresToFeet,
  minutesAt,
  phaseAt,
  timesOther,
} from '../model';
import type { Figure, FlightSeconds, FuelReading } from '../model';

const WHOLE = 0;
const TENTHS = 1;
const DECIMAL_LIMIT = 10;
const PERCENT = 100;
const CLOCK_DIGITS = 2;
const CLOCK_PAD = '0';
const CLOCK_SEPARATOR = ':';
const METRES_STEP = 10;
const FEET_STEP = 100;
const DELAY_DIGITS = 2;

type Values = Record<string, string>;

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

function tenthsBelowTen(value: number): string {
  return formatFixed(value, Math.abs(value) < DECIMAL_LIMIT ? TENTHS : WHOLE);
}

function tenths(value: number): string {
  return formatFixed(value, TENTHS);
}

function roundedTo(value: number, step: number): string {
  return whole(Math.round(value / step) * step);
}

function clockPart(value: number): string {
  return String(value).padStart(CLOCK_DIGITS, CLOCK_PAD);
}

export function formatClock(missionMinutes: number): string {
  const { hours, minutes, seconds } = clockAt(missionMinutes);
  const clock = [String(hours), clockPart(minutes), clockPart(seconds)].join(CLOCK_SEPARATOR);
  return t('timeline.clock', { clock });
}

export function formatPhase(units: number): string {
  return formatClock(minutesAt(units));
}

export function describePhase(units: number): string {
  return t('timeline.value', { time: formatPhase(units), phase: t(DURING_KEYS[phaseAt(units)]) });
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedFormat', { factor: formatNumber(speed) });
}

export function describeSpeed(speed: number): string {
  return t('timeline.speedValue', { factor: formatNumber(speed) });
}

export function formatAltitude(metres: number): string {
  return t('units.altitude', {
    m: roundedTo(metres, METRES_STEP),
    ft: roundedTo(metresToFeet(metres), FEET_STEP),
  });
}

export function formatKmh(kmh: number): string {
  return t('units.kmh', { value: whole(kmh) });
}

export function formatFuel({ kg, share }: FuelReading): string {
  return t('units.fuel', { kg: whole(kg), share: whole(share * PERCENT) });
}

export function formatKg(kg: number): string {
  return t('units.kg', { value: whole(kg) });
}

export function formatPercent(share: number): string {
  return t('units.percent', { value: whole(share * PERCENT) });
}

export function formatKm(km: number): string {
  return t('units.km', { value: formatNumber(km) });
}

export function formatHours(hours: number): string {
  return t('units.hours', { value: formatNumber(hours) });
}

export function formatHoursMinutes(hours: number): string {
  const split = hoursAndMinutes(hours);
  return t('units.hoursMinutes', {
    hours: formatNumber(split.hours),
    minutes: formatNumber(split.minutes),
  });
}

export function formatSeconds(seconds: number): string {
  return t('units.seconds', { value: formatSignificant(seconds, DELAY_DIGITS) });
}

export function formatFlightSeconds({ fast, slow }: FlightSeconds): string {
  return t('units.secondsRange', { from: tenthsBelowTen(fast), to: tenthsBelowTen(slow) });
}

export function formatLinkMode(link: LinkMode): string {
  return t(`link.mode.${link}`);
}

export function formatLinkCrew(link: LinkMode): string {
  return t(`link.crew.${link}`);
}

export function formatLinkDelay(link: LinkMode): string {
  return t(`link.delay.${link}`, {
    oneWay: formatSeconds(HOP_S),
    roundTrip: formatSeconds(ROUND_TRIP_S),
    girths: tenths(HOP_EARTH_GIRTHS),
  });
}

interface ValueNames {
  reaper: string;
  other: string;
  ratio: string;
}

const FIGURE_NAMES: ValueNames = { reaper: 'reaper', other: 'other', ratio: 'ratio' };
const ASPECT_NAMES: ValueNames = { reaper: 'aspect', other: 'otherAspect', ratio: 'slender' };

function figureValues(figure: Figure, comparison: ComparisonId, names = FIGURE_NAMES): Values {
  const other = COMPARED_FIGURES[comparison][figure];
  const ratio = timesOther(figure, comparison);
  const values: Values = { [names.reaper]: formatNumber(REAPER_FIGURES[figure]) };
  if (other !== undefined) values[names.other] = formatNumber(other);
  if (ratio !== undefined) values[names.ratio] = tenths(ratio);
  return values;
}

export function formatSpanComparison(comparison: ComparisonId): string {
  return t(`flight.span.${comparison}`, {
    ...figureValues('spanM', comparison),
    ...figureValues('aspectRatio', comparison, ASPECT_NAMES),
  });
}

export function formatWeightComparison(comparison: ComparisonId): string {
  return t(`flight.weight.${comparison}`, figureValues('weightKg', comparison));
}

export function formatEngineComparison(comparison: ComparisonId): string {
  return t(`flight.engine.${comparison}`, figureValues('powerHp', comparison));
}

export function formatSensorShows(mode: SensorModeId): string {
  return t(`sensor.shows.${mode}`);
}

export function formatSensorAim(sensor: SensorReading): string {
  return t(`sensor.aim.${sensor.onTarget ? 'target' : 'ahead'}`);
}

export function formatMissileStage(stage: MissileStage): string {
  return t(`strike.stage.${stage}`);
}
