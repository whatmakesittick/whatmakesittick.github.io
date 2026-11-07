import { t } from '@core/i18n';
import { NOTES, UNDAMPED_TOP, damperLeadMs, stringsStruck } from '../model';
import type { LiveReader } from '../state';
import { whole } from './format';
import type { ChapterReadouts } from './readouts';

export function dampersReadouts(read: LiveReader): ChapterReadouts {
  return {
    damper: (state) => t(`chapters.dampers.damperValue.${read(state).stroke.damperState}`),
    lead: (state) => t('chapters.dampers.leadValue', { ms: whole(damperLeadMs(state.touch)) }),
    struck: ({ register, pedal }) =>
      t('chapters.dampers.struckValue', {
        struck: whole(stringsStruck(register, pedal)),
        total: whole(NOTES[register].strings),
      }),
    undamped: () =>
      t('chapters.dampers.undampedValue', {
        min: whole(UNDAMPED_TOP.min),
        max: whole(UNDAMPED_TOP.max),
      }),
  };
}
