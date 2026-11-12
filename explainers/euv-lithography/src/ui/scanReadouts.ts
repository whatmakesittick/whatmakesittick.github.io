import { t } from '@core/i18n';
import { formatNumber } from '@core/format';
import { opticsOf, scanSeconds, secondsPerWafer, slitMm } from '../model';
import { SCAN_FACTS } from './copyFacts';
import { hundredths, tenths, whole } from './format';
import { formatWafersPerHour } from './readouts';
import type { ChapterReadouts } from './readouts';

export const SCAN_READOUTS: ChapterReadouts = {
  wph: formatWafersPerHour,
  perWafer: ({ machine }) =>
    t('chapters.scan.perWaferValue', { seconds: whole(secondsPerWafer(machine)) }),
  perField: ({ machine }) =>
    t('chapters.scan.perFieldValue', { seconds: hundredths(scanSeconds(machine)) }),
  fields: () =>
    t('chapters.scan.fieldsValue', {
      low: whole(SCAN_FACTS.fieldsLow),
      high: whole(SCAN_FACTS.fieldsHigh),
    }),
  slit: ({ machine }) => {
    const { w, h } = slitMm(opticsOf(machine));
    return t('chapters.scan.slitValue', { w: whole(w), h: formatNumber(h) });
  },
  sensing: () =>
    t('chapters.scan.sensingValue', {
      pm: whole(SCAN_FACTS.sensingPm),
      rate: formatNumber(SCAN_FACTS.sensingPerSecond),
    }),
  overlay: ({ machine }) =>
    t('chapters.scan.overlayValue', { nm: tenths(SCAN_FACTS.overlayNm[machine]) }),
};
