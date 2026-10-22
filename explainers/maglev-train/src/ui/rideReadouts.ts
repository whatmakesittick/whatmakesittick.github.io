import { t } from '@core/i18n';
import type { GhostReading } from '../ids';
import { LINE_M, tripSeconds } from '../model';
import type { LiveReader } from '../state';
import { formatMinutesSeconds, tenths, toKilometres, whole } from './format';
import type { ChapterReadouts } from './readouts';

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

export function rideReadouts(read: LiveReader): ChapterReadouts {
  return {
    trip: (state) =>
      t('chapters.ride.tripValue', { time: formatMinutesSeconds(tripSeconds(state.topSpeed)) }),
    top: (state) => t(`chapters.ride.topValue.${state.topSpeed}`),
    line: () => t('chapters.ride.lineValue', { km: whole(toKilometres(LINE_M)) }),
    ghost: (state) => formatGhost(read(state).ghost),
  };
}
