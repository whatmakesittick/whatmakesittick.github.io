import { t } from '@core/i18n';
import {
  CDU_APPROACH_K,
  CDU_AREA_M2,
  CDU_KW,
  FACILITY_WATER_C,
  US_WATER_BN_L,
  US_WUE_L_KWH,
  kwToMw,
} from '../model';
import { coolantAt } from '../model/cooling';
import type { DataCenterStoreState } from '../state';
import { formatMedium, hundredths, tenths, whole } from './format';
import type { ChapterReadouts } from './readouts';

function formatRise({ cooling, load }: DataCenterStoreState): string {
  const { supplyC, returnC, medium } = coolantAt(cooling, load);
  return t('chapters.heatOut.riseValue', {
    kelvin: whole(returnC - supplyC),
    medium: formatMedium(medium),
  });
}

export const HEAT_OUT_READOUTS: ChapterReadouts = {
  rise: formatRise,
  facilityWater: () =>
    t('chapters.heatOut.facilityWaterValue', {
      celsius: whole(FACILITY_WATER_C),
      approach: whole(CDU_APPROACH_K),
    }),
  cdu: () =>
    t('chapters.heatOut.cduValue', { mw: whole(kwToMw(CDU_KW)), area: tenths(CDU_AREA_M2) }),
  wue: () => t('chapters.heatOut.wueValue', { litres: hundredths(US_WUE_L_KWH) }),
  usWater: () => t('chapters.heatOut.usWaterValue', { billion: whole(US_WATER_BN_L) }),
};
