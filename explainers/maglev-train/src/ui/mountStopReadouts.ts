import { formatSignificant } from '@core/format';
import { t } from '@core/i18n';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { TopSpeedId } from '../ids';
import { PROFILES, SKID_KMH, TOP_SPEED_KMH } from '../model';
import { createLiveReader } from '../state';
import type { MaglevTrainStore } from '../state';
import { toKilometres, whole } from './format';

const BRAKE_DISTANCE_DIGITS = 2;

function formatBrakeDistance(topSpeed: TopSpeedId): string {
  return t('chapters.stop.distanceValue', {
    km: formatSignificant(toKilometres(PROFILES[topSpeed].brakeMetres), BRAKE_DISTANCE_DIGITS),
    kmh: whole(TOP_SPEED_KMH[topSpeed]),
  });
}

export function mountStopReadouts(root: Document, store: MaglevTrainStore): Disposer {
  const read = createLiveReader();
  return mountLiveReadouts(root, store, {
    flow: (state) => t(`chapters.stop.flowValue.${read(state).power.flow}`),
    onboard: (state) => t(`chapters.stop.onboardValue.${read(state).power.onboard}`),
    brakeDistance: (state) => formatBrakeDistance(state.topSpeed),
    skid: () => t('chapters.stop.skidValue', { kmh: whole(SKID_KMH) }),
  });
}
