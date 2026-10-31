import { t } from '@core/i18n';
import { PUE, RACK_COUNT, ROW_COUNT, WORLD_PERCENT_2024, WORLD_TWH_2024 } from '../model';
import { facilityPowerMw, hallPowerMw } from '../model/power';
import type { DataCenterStoreState } from '../state';
import { TENTHS, formatUnit, formatYear, hundredths, tenths, whole } from './format';
import type { ChapterReadouts } from './readouts';

const WORLD_YEAR = 2024;

function formatFacility({ cooling, load, benchmark }: DataCenterStoreState): string {
  return t('chapters.building.facilityValue', {
    mw: tenths(facilityPowerMw(hallPowerMw(cooling, load), benchmark)),
    pue: hundredths(PUE[benchmark]),
  });
}

export const BUILDING_READOUTS: ChapterReadouts = {
  racks: () =>
    t('chapters.building.racksValue', { racks: whole(RACK_COUNT), rows: whole(ROW_COUNT) }),
  hallIt: ({ cooling, load }) => formatUnit('mw', hallPowerMw(cooling, load), TENTHS),
  facility: formatFacility,
  world: () =>
    t('chapters.building.worldValue', {
      twh: whole(WORLD_TWH_2024),
      percent: tenths(WORLD_PERCENT_2024),
      year: formatYear(WORLD_YEAR),
    }),
};
