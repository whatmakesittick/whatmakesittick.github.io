import { t } from '@core/i18n';
import {
  GENSET_FUEL_LPH,
  GENSET_MW,
  GENSET_T,
  GEN_REAL_S,
  GEN_START_S,
  POWER_OUTAGE_PERCENT,
  UPS_MINUTES,
} from '../model';
import { formatYear, tenths, whole } from './format';
import type { ChapterReadouts } from './readouts';

const OUTAGE_YEAR = 2025;

export const POWER_IN_READOUTS: ChapterReadouts = {
  chain: () => t('chapters.powerIn.chainValue'),
  takeover: () =>
    t('chapters.powerIn.takeoverValue', {
      code: whole(GEN_START_S),
      min: whole(GEN_REAL_S.min),
      max: whole(GEN_REAL_S.max),
    }),
  rideThrough: () =>
    t('chapters.powerIn.rideThroughValue', {
      min: whole(UPS_MINUTES.min),
      max: whole(UPS_MINUTES.max),
    }),
  genset: () =>
    t('chapters.powerIn.gensetValue', { mw: tenths(GENSET_MW), tonnes: whole(GENSET_T) }),
  fuel: () => t('chapters.powerIn.fuelValue', { litres: whole(GENSET_FUEL_LPH) }),
  outages: () =>
    t('chapters.powerIn.outagesValue', {
      percent: whole(POWER_OUTAGE_PERCENT),
      year: formatYear(OUTAGE_YEAR),
    }),
};
