import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import type { LoadId } from '../ids';
import { AREA_DISTANCE_KM, ENDURANCE_H, stationHours, transitHours } from '../model';
import type { ReaperStore } from '../state';
import { formatHours, formatHoursMinutes, formatKm } from './format';

type SelectedArea = readonly [areaDistance: number, load: LoadId];

export function mountAreaDistanceControl(root: Document, store: ReaperStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'area-distance',
    range: AREA_DISTANCE_KM,
    select: (state): SelectedArea => [state.areaDistance, state.load],
    value: ([km]) => km,
    format: ([km]) => formatKm(km),
    set: (state, km) => state.setAreaDistance(km),
    readouts: {
      'endurance-hours': ([, load]) => formatHours(ENDURANCE_H[load]),
      'endurance-transit': ([km]) => formatHoursMinutes(transitHours(km)),
      'endurance-station': ([km, load]) => formatHoursMinutes(stationHours(km, load)),
    },
  });
}
