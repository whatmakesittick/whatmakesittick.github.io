import { formatFixed } from '@core/format';
import { t } from '@core/i18n';
import type { FlightMode, RotorHalf, VerticalTendency } from '../model';

const PRECISE_BELOW = 10;

export const HALF_KEYS: Record<RotorHalf, string> = {
  advancing: 'phases.advancing',
  retreating: 'phases.retreating',
};

export const FLIGHT_MODE_KEYS: Record<FlightMode, string> = {
  hover: 'flightModes.hover',
  forward: 'flightModes.forward',
};

const TENDENCY_KEYS: Record<VerticalTendency, string> = {
  descend: 'tendencies.descend',
  hover: 'tendencies.hover',
  climb: 'tendencies.climb',
};

const SPEED_DESCRIPTIONS: readonly { upTo: number; key: string }[] = [
  { upTo: 20, key: 'controls.speedDescriptions.verySlow' },
  { upTo: 250, key: 'controls.speedDescriptions.slowMotion' },
  { upTo: Number.POSITIVE_INFINITY, key: 'controls.speedDescriptions.nearReal' },
];

export function halfLabel(half: RotorHalf): string {
  return t(HALF_KEYS[half]);
}

export function tendencyLabel(tendency: VerticalTendency): string {
  return t(TENDENCY_KEYS[tendency]);
}

export function formatDegrees(degrees: number): string {
  return t('units.degrees', { value: formatFixed(degrees, 0) });
}

export function formatPitch(degrees: number): string {
  return t('units.degrees', { value: formatFixed(degrees, 1) });
}

export function formatRpm(rpm: number): string {
  return t('units.rpm', { value: formatFixed(rpm, 0) });
}

export function formatSpeed(metresPerSecond: number): string {
  const digits = metresPerSecond < PRECISE_BELOW ? 1 : 0;
  return t('units.metresPerSecond', { value: formatFixed(metresPerSecond, digits) });
}

export function describeRpm(rpm: number): string {
  const band = SPEED_DESCRIPTIONS.find((description) => rpm <= description.upTo);
  return band ? t(band.key) : '';
}
