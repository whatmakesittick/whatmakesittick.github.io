import { formatCompact, formatFixed, formatNumber, formatSignificant } from '@core/format';
import { t } from '@core/i18n';
import { FOLLOW_SEQUENCE } from '../ids';
import type { FieldId, GradientAxisId, TissueId, WeightingId } from '../ids';
import {
  BORE,
  FIELDS,
  HELIUM_K,
  KELVIN_AT_ZERO_CELSIUS,
  MODEL_SIZE,
  REAL_LINES,
  RELAXATION,
  SECONDS_PER_MINUTE,
  earthMultiple,
  edgeShiftMT,
  frequencySpreadKHz,
  larmorMHz,
  metresToCentimetres,
  relativeBrightness,
  riseTimeMs,
  scanSeconds,
  shareOfField,
  slowdown,
  spinSurplus,
  surplusPerMm3,
  tipComponents,
} from '../model';
import type { TimeGauge } from '../state';

const WHOLE = 0;
const TENTHS = 1;
const HUNDREDTHS = 2;
const PERCENT = 100;
const PER_MILLION = 1e6;
const EARTH_DIGITS = 2;
const RISE_DIGITS = 3;
const SLOWDOWN_DIGITS = 3;
const FM_BAND_LOW_MHZ = 87.5;
const DECIMAL = 10;
const RADII_PER_DIAMETER = 2;
export const TURBO_LINES_PER_REPETITION = 16;
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUPERSCRIPT_MINUS = '⁻';

function unit(key: string, value: string): string {
  return t(`units.${key}`, { value });
}

export function formatPercent(fraction: number): string {
  return unit('percent', formatNumber(Math.round(fraction * PERCENT)));
}

export function formatDegrees(degrees: number): string {
  return unit('degrees', formatNumber(degrees));
}

export function formatMs(ms: number): string {
  return unit('ms', formatNumber(ms));
}

export function formatLarmor(field: FieldId): string {
  return unit('mhz', formatFixed(larmorMHz(field), TENTHS));
}

export function formatTimeGauge(gauge: TimeGauge): string {
  return t('units.msOf', {
    value: formatNumber(Math.round(gauge.ms)),
    total: formatNumber(gauge.totalMs),
  });
}

export function formatLines(lines: number): string {
  return t('units.linesOf', { value: formatNumber(lines), total: formatNumber(MODEL_SIZE) });
}

export function formatFieldNow(field: FieldId): string {
  return t('chapters.overview.field', { tesla: unit('tesla', formatNumber(FIELDS[field].tesla)) });
}

export function formatBoreWidth(): string {
  const cm = metresToCentimetres(RADII_PER_DIAMETER * BORE.radius);
  return t('chapters.overview.bore', { cm: unit('cm', formatNumber(Math.round(cm))) });
}

export function formatEarthMultiple(field: FieldId): string {
  const { min, max } = earthMultiple(field);
  return t('chapters.magnet.earthValue', {
    min: formatSignificant(min, EARTH_DIGITS),
    max: formatSignificant(max, EARTH_DIGITS),
  });
}

export function formatHelium(): string {
  return t('units.kelvin', {
    kelvin: formatFixed(HELIUM_K, TENTHS),
    celsius: formatNumber(Math.round(HELIUM_K - KELVIN_AT_ZERO_CELSIUS)),
  });
}

export function formatFringe(field: FieldId): string {
  const { along, side } = FIELDS[field].fringe;
  return t('chapters.magnet.fringeValue', { along: formatNumber(along), side: formatNumber(side) });
}

export function formatLarmorBand(field: FieldId): string {
  const band = larmorMHz(field) < FM_BAND_LOW_MHZ ? 'belowFm' : 'aboveFm';
  return t('chapters.spins.larmorBand', {
    value: formatLarmor(field),
    band: t(`chapters.spins.band.${band}`),
  });
}

export function formatSurplus(field: FieldId): string {
  return t('chapters.spins.surplusValue', {
    perMillion: formatNumber(Math.round(spinSurplus(field) * PER_MILLION)),
  });
}

export function toSuperscript(exponent: number): string {
  const digits = [...String(Math.abs(exponent))].map((digit) => SUPERSCRIPT_DIGITS[Number(digit)]);
  return (exponent < 0 ? SUPERSCRIPT_MINUS : '') + digits.join('');
}

export function formatSurplusCount(field: FieldId): string {
  const count = surplusPerMm3(field);
  const exponent = Math.floor(Math.log10(count));
  return t('chapters.spins.countValue', {
    mantissa: formatFixed(count / DECIMAL ** exponent, TENTHS),
    exponent: toSuperscript(exponent),
  });
}

export function formatSlowdown(field: FieldId): string {
  return t('chapters.spins.slowdownValue', {
    factor: formatCompact(slowdown(field), SLOWDOWN_DIGITS),
  });
}

export function formatAcross(tipAngle: number): string {
  return formatPercent(tipComponents(tipAngle).across);
}

export function formatAlong(tipAngle: number): string {
  return formatPercent(tipComponents(tipAngle).along);
}

export function formatT1(field: FieldId, tissue: TissueId): string {
  return formatMs(RELAXATION[field][tissue].t1);
}

export function formatT2(field: FieldId, tissue: TissueId): string {
  return formatMs(RELAXATION[field][tissue].t2);
}

export function formatEdgeShift(): string {
  return unit('mT', formatFixed(edgeShiftMT(), TENTHS));
}

export function formatFieldShare(field: FieldId): string {
  return unit('percent', formatFixed(shareOfField(field), HUNDREDTHS));
}

export function formatSpread(): string {
  return unit('kHz', formatFixed(frequencySpreadKHz(), WHOLE));
}

export function formatRise(): string {
  return unit('ms', formatSignificant(riseTimeMs(), RISE_DIGITS));
}

export function formatAxisRole(axis: GradientAxisId | null): string {
  return t(`chapters.gradients.roleValue.${axis ?? FOLLOW_SEQUENCE}`);
}

export function formatBrightness(field: FieldId, weighting: WeightingId, tissue: TissueId): string {
  return formatPercent(relativeBrightness(field, weighting)[tissue]);
}

export function formatScanTime(weighting: WeightingId): string {
  return t('chapters.picture.scanTimeValue', {
    minutes: formatFixed(scanSeconds(weighting) / SECONDS_PER_MINUTE, TENTHS),
    lines: formatNumber(REAL_LINES),
  });
}

export function formatTurbo(weighting: WeightingId): string {
  return t('chapters.picture.turboValue', {
    seconds: formatNumber(scanSeconds(weighting) / TURBO_LINES_PER_REPETITION),
  });
}
