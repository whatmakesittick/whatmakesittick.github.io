import { t } from '@core/i18n';
import { formatNumber } from '@core/format';
import { fieldMm, opticsOf, smallestHalfPitchNm } from '../model';
import { COMPARE_FACTS } from './copyFacts';
import { tenths, whole } from './format';
import type { ChapterReadouts } from './readouts';

export const COMPARE_READOUTS: ChapterReadouts = {
  shrink: ({ machine }) => t(`chapters.compare.shrinkValue.${opticsOf(machine)}`),
  field: ({ machine }) => {
    const { w, h } = fieldMm(opticsOf(machine));
    return t('chapters.compare.fieldValue', { w: whole(w), h: formatNumber(h) });
  },
  line: ({ machine }) => {
    const nm = formatNumber(smallestHalfPitchNm(opticsOf(machine)));
    return t('chapters.compare.lineValue', { width: nm, gap: nm });
  },
  duv: () =>
    t('chapters.compare.duvValue', {
      low: whole(COMPARE_FACTS.duvLowNm),
      high: whole(COMPARE_FACTS.duvHighNm),
    }),
  photon: () =>
    t('chapters.compare.photonValue', {
      ev: tenths(COMPARE_FACTS.photonEv),
      times: whole(COMPARE_FACTS.photonTimes),
    }),
  price: () => t('chapters.compare.priceValue'),
};
