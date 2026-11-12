import { t } from '@core/i18n';
import { formatNumber } from '@core/format';
import { DROPLETS_PER_SECOND, PULSES_PER_DROPLET } from '../model';
import { LIGHT_FACTS } from './copyFacts';
import { tenths, whole } from './format';
import type { ChapterReadouts } from './readouts';

export const LIGHT_READOUTS: ChapterReadouts = {
  droplet: () =>
    t('chapters.light.dropletValue', {
      low: whole(LIGHT_FACTS.dropletLowUm),
      high: whole(LIGHT_FACTS.dropletHighUm),
    }),
  speed: () =>
    t('chapters.light.speedValue', {
      low: whole(LIGHT_FACTS.speedLowMs),
      high: whole(LIGHT_FACTS.speedHighMs),
    }),
  spacing: () =>
    t('chapters.light.spacingValue', {
      low: tenths(LIGHT_FACTS.spacingLowMm),
      high: tenths(LIGHT_FACTS.spacingHighMm),
    }),
  pulses: () =>
    t('chapters.light.pulsesValue', {
      count: formatNumber(DROPLETS_PER_SECOND * PULSES_PER_DROPLET),
    }),
  flattened: () => t('chapters.light.flattenedValue', { um: whole(LIGHT_FACTS.flattenedUm) }),
  plasma: () =>
    t('chapters.light.plasmaValue', {
      celsius: formatNumber(LIGHT_FACTS.plasmaCelsius),
      low: whole(LIGHT_FACTS.plasmaSunLow),
      high: whole(LIGHT_FACTS.plasmaSunHigh),
    }),
  conversion: () =>
    t('chapters.light.conversionValue', { percent: whole(LIGHT_FACTS.conversionPercent) }),
};
