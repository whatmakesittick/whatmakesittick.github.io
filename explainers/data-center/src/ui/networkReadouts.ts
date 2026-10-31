import { t } from '@core/i18n';
import { FIBRE_US_PER_KM, NVLINK_GPU_TBS, NVLINK_RACK_TBS, SWITCH_NS } from '../model';
import { DISTANCE_KM, hallPathUs, roundTripMs } from '../model/network';
import { significant, tenths, whole } from './format';
import type { ChapterReadouts } from './readouts';

const ROUND_TRIP_DIGITS = 2;

export const NETWORK_READOUTS: ChapterReadouts = {
  nvlink: () =>
    t('chapters.network.nvlinkValue', {
      gpu: tenths(NVLINK_GPU_TBS),
      rack: whole(NVLINK_RACK_TBS),
    }),
  // `ns` is an i18next option name, so the value has to go through `replace`.
  switch: () => t('chapters.network.switchValue', { replace: { ns: whole(SWITCH_NS) } }),
  fibre: () => t('chapters.network.fibreValue', { us: tenths(FIBRE_US_PER_KM) }),
  hall: () => t('chapters.network.hallValue', { us: tenths(hallPathUs()) }),
  roundTrip: ({ distance }) =>
    t('chapters.network.roundTripValue', {
      ms: significant(roundTripMs(DISTANCE_KM[distance]), ROUND_TRIP_DIGITS),
    }),
};
