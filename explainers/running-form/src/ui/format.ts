import { formatFixed, formatNumber, formatSigned } from '@core/format';
import { t } from '@core/i18n';
import { formatPaceKm } from '../model';

const SPEED_DIGITS = 1;
const LENGTH_DIGITS = 2;
const BODY_WEIGHT_GAUGE_DIGITS = 1;
const BODY_WEIGHT_CHAPTER_DIGITS = 2;
const CENTIMETER_DIGITS = 1;
const MILLISECONDS_PER_SECOND = 1000;
const CENTIMETERS_PER_METER = 100;
const FRACTION_TO_PERCENT = 100;

function unit(key: string, value: string): string {
  return t(`units.${key}`, { value });
}

function wholeNumber(value: number): number {
  return Math.round(value) || 0;
}

export function formatRate(rate: number): string {
  return formatNumber(Math.round(rate));
}

export function formatLength(meters: number): string {
  return formatFixed(meters, LENGTH_DIGITS);
}

export function formatSpeed(speedMs: number): string {
  return formatFixed(speedMs, SPEED_DIGITS);
}

export function formatMetersPerSecond(speedMs: number): string {
  return unit('metersPerSecond', formatSpeed(speedMs));
}

export function formatPerMinute(rate: number): string {
  return unit('perMinute', formatRate(rate));
}

export function formatMeters(meters: number): string {
  return unit('meters', formatLength(meters));
}

export function formatMilliseconds(seconds: number): string {
  return unit('milliseconds', formatNumber(wholeNumber(seconds * MILLISECONDS_PER_SECOND)));
}

export function formatDegrees(degrees: number): string {
  return unit('degrees', formatNumber(wholeNumber(degrees)));
}

export function formatDegreesSigned(degrees: number): string {
  return unit('degrees', formatSigned(wholeNumber(degrees), 0));
}

export function formatBodyWeights(bodyWeights: number, digits = BODY_WEIGHT_GAUGE_DIGITS): string {
  return unit('bodyWeights', formatFixed(bodyWeights, digits));
}

export function formatBodyWeightsDetailed(bodyWeights: number): string {
  return formatBodyWeights(bodyWeights, BODY_WEIGHT_CHAPTER_DIGITS);
}

export function formatCentimeters(meters: number): string {
  return unit('centimeters', formatFixed(meters * CENTIMETERS_PER_METER, CENTIMETER_DIGITS));
}

export function formatCentimetersSigned(centimeters: number): string {
  return unit('centimetersSigned', formatSigned(centimeters, CENTIMETER_DIGITS));
}

export function formatShareNumber(share: number): string {
  return formatNumber(wholeNumber(share * FRACTION_TO_PERCENT));
}

export function formatPercentOfShare(share: number): string {
  return unit('percent', formatShareNumber(share));
}

export function formatPercentSigned(percent: number): string {
  return unit('signedPercent', formatSigned(wholeNumber(percent), 0));
}

export function formatPerKilometer(speedMs: number): string {
  return unit('perKilometer', formatPaceKm(speedMs));
}
