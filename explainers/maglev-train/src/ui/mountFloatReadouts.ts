import { t } from '@core/i18n';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { MotionReading } from '../ids';
import { CLEARANCE_MM, GAP_BAND_MM, GAP_MM, SECTION_COUNT_TRAIN, SECTION_MASS_T } from '../model';
import { createLiveReader } from '../state';
import type { MaglevTrainStore } from '../state';
import { WHOLE, formatMm, formatMmRange, whole } from './format';

type LiftState = 'skids' | 'lifting' | 'floating' | 'settling';

function liftStateOf({ phase, onSkids, gapMm }: MotionReading): LiftState {
  if (onSkids) return 'skids';
  if (gapMm <= GAP_MM) return 'floating';
  return phase === 'liftOff' ? 'lifting' : 'settling';
}

export function mountFloatReadouts(root: Document, store: MaglevTrainStore): Disposer {
  const read = createLiveReader();
  return mountLiveReadouts(root, store, {
    lift: (state) => t(`chapters.float.liftValue.${liftStateOf(read(state).motion)}`),
    target: () => formatMm(GAP_MM, WHOLE),
    band: () => formatMmRange(GAP_BAND_MM.min, GAP_BAND_MM.max),
    clearance: () => formatMm(CLEARANCE_MM, WHOLE),
    mass: () =>
      t('chapters.float.massValue', {
        tonnes: whole(SECTION_MASS_T),
        sections: whole(SECTION_COUNT_TRAIN),
      }),
  });
}
