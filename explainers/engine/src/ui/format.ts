import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { STROKE_DEGREES } from '../model';
import type { EngineType, Stroke } from '../model';

export const STROKE_KEYS: Record<Stroke, string> = {
  intake: 'strokes.intake',
  compression: 'strokes.compression',
  power: 'strokes.power',
  exhaust: 'strokes.exhaust',
};

export const ENGINE_TYPE_KEYS: Record<EngineType, string> = {
  petrol: 'engine.types.petrol',
  diesel: 'engine.types.diesel',
};

const RPM_DESCRIPTIONS: readonly { upTo: number; key: string }[] = [
  { upTo: 20, key: 'controls.speedDescriptions.verySlow' },
  { upTo: 200, key: 'controls.speedDescriptions.slowMotion' },
  { upTo: 450, key: 'controls.speedDescriptions.halfIdle' },
  { upTo: Number.POSITIVE_INFINITY, key: 'controls.speedDescriptions.nearIdle' },
];

export type DeadCentre = 'top' | 'bottom';

const DEAD_CENTRE_KEYS: Record<DeadCentre, string> = {
  top: 'deadCentres.top',
  bottom: 'deadCentres.bottom',
};

const PRECISE_BELOW = 10;
const SLOW_SPEED_BELOW = 1;

export interface DeadCentreOffset {
  degrees: number;
  early: boolean;
  centre: DeadCentre;
}

export function strokeLabel(stroke: Stroke): string {
  return t(STROKE_KEYS[stroke]);
}

export function engineLabel(type: EngineType): string {
  return t(ENGINE_TYPE_KEYS[type]);
}

export function deadCentreLabel(centre: DeadCentre): string {
  return t(DEAD_CENTRE_KEYS[centre]);
}

export function formatDegrees(degrees: number): string {
  return t('units.degrees', { value: formatFixed(degrees, 0) });
}

export function formatRpm(rpm: number): string {
  return t('units.rpm', { value: formatFixed(rpm, 0) });
}

export function describeRpm(rpm: number): string {
  const band = RPM_DESCRIPTIONS.find((description) => rpm <= description.upTo);
  return band ? t(band.key) : '';
}

export function formatMultiple(value: number): string {
  return t('units.times', { value: formatNumber(value) });
}

export function formatPressure(relative: number): string {
  const digits = relative < PRECISE_BELOW ? 1 : 0;
  return t('units.times', { value: formatFixed(relative, digits) });
}

export function formatSpeed(metresPerSecond: number): string {
  const speed = Math.abs(metresPerSecond);
  const digits = speed < SLOW_SPEED_BELOW ? 2 : 1;
  return t('units.metresPerSecond', { value: formatFixed(speed, digits) });
}

export function formatRatio(ratio: number): string {
  return t('units.ratio', { value: formatFixed(ratio, 1) });
}

export function formatMillimetres(millimetres: number): string {
  return t('units.millimetres', { value: formatFixed(millimetres, 1) });
}

export function deadCentreOffset(angle: number): DeadCentreOffset {
  const nearestIndex = Math.round(angle / STROKE_DEGREES);
  const offset = angle - nearestIndex * STROKE_DEGREES;
  const isTop = Math.abs(nearestIndex) % 2 === 0;
  return { degrees: Math.abs(offset), early: offset < 0, centre: isTop ? 'top' : 'bottom' };
}

export function formatOffsetLong(offset: DeadCentreOffset): string {
  return t(offset.early ? 'deadCentres.before' : 'deadCentres.after', {
    degrees: formatDegrees(offset.degrees),
    centre: deadCentreLabel(offset.centre),
  });
}

export function formatOffsetShort(offset: DeadCentreOffset): string {
  return t(offset.early ? 'deadCentres.early' : 'deadCentres.late', {
    degrees: formatDegrees(offset.degrees),
  });
}
