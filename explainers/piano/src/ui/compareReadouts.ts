import { t } from '@core/i18n';
import { COMPARE } from '../model';
import type { ChapterReadouts } from './readouts';

export const COMPARE_READOUTS: ChapterReadouts = {
  cmpMove: ({ compare }) => t(COMPARE.move[compare]),
  cmpReturn: ({ compare }) => t(COMPARE.return[compare]),
  cmpTouch: ({ compare }) => t(COMPARE.touch[compare]),
};
