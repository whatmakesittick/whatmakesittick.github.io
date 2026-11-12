import { t } from '@core/i18n';
import { formatNumber } from '@core/format';
import { LIGHT_FACTS } from './copyFacts';
import { whole } from './format';
import type { ChapterReadouts } from './readouts';

export const LIGHT_READOUTS: ChapterReadouts = {
  droplet: () =>
    t('chapters.light.dropletValue', {
      um: whole(LIGHT_FACTS.dropletUm),
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
      low: whole(LIGHT_FACTS.spacingLowMm),
      high: whole(LIGHT_FACTS.spacingHighMm),
    }),
  pulses: () =>
    t('chapters.light.pulsesValue', { count: formatNumber(LIGHT_FACTS.pulsesPerSecond) }),
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
