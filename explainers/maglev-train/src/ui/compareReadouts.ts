import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import type { CompareId } from '../ids';
import { COMPARE, energyFor } from '../model';
import type { EnergyReading } from '../model';
import { WHOLE, formatMm, formatYear, whole } from './format';
import type { ChapterReadouts } from './readouts';

function formatCompareGap(compare: CompareId): string {
  const { gapMm } = COMPARE[compare];
  return gapMm === null ? t('chapters.compare.gapWheels') : formatMm(gapMm, WHOLE);
}

function formatRecord(compare: CompareId): string {
  const { recordKmh, recordYear } = COMPARE[compare];
  return t('chapters.compare.recordValue', {
    kmh: formatNumber(recordKmh),
    year: formatYear(recordYear),
  });
}

function formatEnergy({ maglev, wheel, atKmh }: EnergyReading): string {
  const values = { maglev: whole(maglev), kmh: whole(atKmh) };
  if (wheel === null) return t('chapters.compare.energyFast', values);
  return t('chapters.compare.energyValue', { ...values, wheel: whole(wheel) });
}

export const COMPARE_READOUTS: ChapterReadouts = {
  cmpGap: (state) => formatCompareGap(state.compare),
  cmpRecord: (state) => formatRecord(state.compare),
  cmpLift: (state) => t(`chapters.compare.liftValue.${COMPARE[state.compare].lift}`),
  energy: (state) => formatEnergy(energyFor(state.topSpeed)),
};
