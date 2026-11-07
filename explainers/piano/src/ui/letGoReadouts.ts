import { t } from '@core/i18n';
import { CHECK_MM, LET_OFF_MM, LET_OFF_RANGE_MM, REPEATS_PER_SECOND, freeFlightMs } from '../model';
import { tenths, whole } from './format';
import type { ChapterReadouts } from './readouts';

export const LET_GO_READOUTS: ChapterReadouts = {
  letOff: () =>
    t('chapters.letGo.letOffValue', {
      min: whole(LET_OFF_RANGE_MM.min),
      max: whole(LET_OFF_RANGE_MM.max),
      model: tenths(LET_OFF_MM),
    }),
  flight: (state) => t('chapters.letGo.flightValue', { ms: tenths(freeFlightMs(state.touch)) }),
  check: (state) => t('chapters.letGo.checkValue', { mm: whole(CHECK_MM[state.touch]) }),
  repeat: () =>
    t('chapters.letGo.repeatValue', {
      grand: whole(REPEATS_PER_SECOND.grand),
      upright: whole(REPEATS_PER_SECOND.upright),
    }),
};
