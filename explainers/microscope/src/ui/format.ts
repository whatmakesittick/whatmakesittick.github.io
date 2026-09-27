import { formatFixed, formatSigned } from '@core/format';
import { t } from '@core/i18n';
import { phaseAt } from '../model';
import type { EyepieceId, ObjectiveId, PhaseId } from '../model';

const APERTURE_DIGITS = 2;
const FINE_FIELD_DIGITS = 2;
const COARSE_FIELD_DIGITS = 1;
const FINE_FIELD_BELOW_MM = 1;

export const PHASE_KEYS: Record<PhaseId, string> = {
  lamp: 'timeline.phase.lamp',
  condenser: 'timeline.phase.condenser',
  specimen: 'timeline.phase.specimen',
  objective: 'timeline.phase.objective',
  tube: 'timeline.phase.tube',
  eyepiece: 'timeline.phase.eyepiece',
  eye: 'timeline.phase.eye',
};

const DURING_KEYS: Record<PhaseId, string> = {
  lamp: 'timeline.during.lamp',
  condenser: 'timeline.during.condenser',
  specimen: 'timeline.during.specimen',
  objective: 'timeline.during.objective',
  tube: 'timeline.during.tube',
  eyepiece: 'timeline.during.eyepiece',
  eye: 'timeline.during.eye',
};

export const OBJECTIVE_KEYS: Record<ObjectiveId, string> = {
  x4: 'controls.objectiveOptions.x4',
  x10: 'controls.objectiveOptions.x10',
  x40: 'controls.objectiveOptions.x40',
  x100: 'controls.objectiveOptions.x100',
};

export const EYEPIECE_KEYS: Record<EyepieceId, string> = {
  x10: 'controls.eyepieceOptions.x10',
  x125: 'controls.eyepieceOptions.x125',
  x15: 'controls.eyepieceOptions.x15',
};

export function formatPosition(millimetres: number): string {
  return t('units.mm', { value: formatFixed(Math.floor(millimetres), 0) });
}

export function describePosition(millimetres: number): string {
  return t('timeline.value', {
    position: formatPosition(millimetres),
    phase: t(DURING_KEYS[phaseAt(millimetres)]),
  });
}

export function formatSpeed(millimetresPerSecond: number): string {
  return t('units.mmPerSecond', { value: formatFixed(millimetresPerSecond, 0) });
}

export function describeSpeed(millimetresPerSecond: number): string {
  return t('timeline.speedValue', { value: formatFixed(millimetresPerSecond, 0) });
}

export function formatTimes(magnification: number): string {
  return t('units.times', { value: formatFixed(magnification, 0) });
}

export function formatAperture(aperture: number): string {
  return formatFixed(aperture, APERTURE_DIGITS);
}

export function formatMicrometres(micrometres: number, digits: number): string {
  return t('units.um', { value: formatFixed(micrometres, digits) });
}

export function formatFocus(micrometres: number): string {
  return t('units.um', { value: formatSigned(micrometres, 0) });
}

export function formatNanometres(nanometres: number): string {
  return t('units.nm', { value: formatFixed(nanometres, 0) });
}

export function formatField(millimetres: number): string {
  const digits = millimetres < FINE_FIELD_BELOW_MM ? FINE_FIELD_DIGITS : COARSE_FIELD_DIGITS;
  return t('units.mm', { value: formatFixed(millimetres, digits) });
}
