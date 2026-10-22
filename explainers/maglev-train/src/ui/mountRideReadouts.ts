import { t } from '@core/i18n';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { GhostReading } from '../ids';
import { LINE_M, tripSeconds } from '../model';
import { createLiveReader } from '../state';
import type { MaglevTrainStore } from '../state';
import { formatMinutesSeconds, tenths, toKilometres, whole } from './format';

function isStanding({ speedKmh, behind }: GhostReading): boolean {
  return speedKmh === 0 && behind === 0;
}

function formatGhost(ghost: GhostReading): string {
  if (isStanding(ghost)) return t('chapters.ride.ghostStanding');
  return t('chapters.ride.ghostValue', {
    km: tenths(toKilometres(ghost.behind)),
    kmh: whole(ghost.speedKmh),
  });
}

export function mountRideReadouts(root: Document, store: MaglevTrainStore): Disposer {
  const read = createLiveReader();
  return mountLiveReadouts(root, store, {
    trip: (state) =>
      t('chapters.ride.tripValue', { time: formatMinutesSeconds(tripSeconds(state.topSpeed)) }),
    top: (state) => t(`chapters.ride.topValue.${state.topSpeed}`),
    line: () => t('chapters.ride.lineValue', { km: whole(toKilometres(LINE_M)) }),
    ghost: (state) => formatGhost(read(state).ghost),
  });
}
