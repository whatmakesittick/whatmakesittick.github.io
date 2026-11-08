import { t } from '@core/i18n';
import { BLOW_RANGE_MM, KEY_DIP_MM, PARTS_COUNT, touchTimeMs } from '../model';
import { formatRange, formatUnit, whole } from './format';
import type { ChapterReadouts } from './readouts';

export const KEY_READOUTS: ChapterReadouts = {
  touchTime: (state) => t('chapters.key.touchTimeValue', { ms: whole(touchTimeMs(state.touch)) }),
  dip: () => formatUnit('aboutMm', KEY_DIP_MM),
  blow: () => formatRange('mmRange', BLOW_RANGE_MM.min, BLOW_RANGE_MM.max),
  parts: () => t('chapters.key.partsValue', { count: whole(PARTS_COUNT) }),
};
