import { t } from '@core/i18n';
import { MIRROR_FACTS } from './copyFacts';
import { HUNDREDTHS, whole } from './format';
import type { ChapterReadouts } from './readouts';
import { formatFixed } from '@core/format';

const GLASS_DIGITS = 3;

export const MIRRORS_READOUTS: ChapterReadouts = {
  layers: () => t('chapters.mirrors.layersValue', { count: whole(MIRROR_FACTS.layers) }),
  reflect: () =>
    t('chapters.mirrors.reflectValue', { percent: whole(MIRROR_FACTS.reflectPercent) }),
  rough: () => t('chapters.mirrors.roughValue', { pm: whole(MIRROR_FACTS.roughnessPm) }),
  vacuum: () =>
    t('chapters.mirrors.vacuumValue', {
      air: formatFixed(MIRROR_FACTS.airPercent, HUNDREDTHS),
      glass: formatFixed(MIRROR_FACTS.glassPercent, GLASS_DIGITS),
    }),
};
