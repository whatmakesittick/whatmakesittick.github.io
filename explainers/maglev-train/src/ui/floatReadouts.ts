import { t } from '@core/i18n';
import type { MotionReading } from '../ids';
import { CLEARANCE_MM, GAP_BAND_MM, GAP_MM, SECTION_COUNT_TRAIN, SECTION_MASS_T } from '../model';
import type { LiveReader } from '../state';
import { WHOLE, formatMm, formatRange, whole } from './format';
import type { ChapterReadouts } from './readouts';

type LiftState = 'skids' | 'lifting' | 'floating' | 'settling';

function liftStateOf({ phase, onSkids, gapMm }: MotionReading): LiftState {
  if (onSkids) return 'skids';
  if (gapMm <= GAP_MM) return 'floating';
  return phase === 'liftOff' ? 'lifting' : 'settling';
}

export function floatReadouts(read: LiveReader): ChapterReadouts {
  return {
    lift: (state) => t(`chapters.float.liftValue.${liftStateOf(read(state).motion)}`),
    target: () => formatMm(GAP_MM, WHOLE),
    band: () => formatRange('mmRange', GAP_BAND_MM.min, GAP_BAND_MM.max),
    clearance: () => formatMm(CLEARANCE_MM, WHOLE),
    mass: () =>
      t('chapters.float.massValue', {
        tonnes: whole(SECTION_MASS_T),
        sections: whole(SECTION_COUNT_TRAIN),
      }),
  };
}
