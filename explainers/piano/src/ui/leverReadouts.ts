import { t } from '@core/i18n';
import { ACTION_RATIO_RANGE, HAMMER_SPEED_MS, dropHeightCm, keySpeedAtLetOff } from '../model';
import { HUNDREDTHS, TENTHS, formatUnit, whole } from './format';
import type { ChapterReadouts } from './readouts';

export const LEVER_READOUTS: ChapterReadouts = {
  ratio: () =>
    t('chapters.lever.ratioValue', {
      min: whole(ACTION_RATIO_RANGE.min),
      max: whole(ACTION_RATIO_RANGE.max),
    }),
  keySpeed: (state) => formatUnit('metresPerSecond', keySpeedAtLetOff(state.touch), HUNDREDTHS),
  hammerSpeed: (state) => formatUnit('metresPerSecond', HAMMER_SPEED_MS[state.touch], TENTHS),
  drop: (state) => t('chapters.lever.dropValue', { cm: whole(dropHeightCm(state.touch)) }),
};
