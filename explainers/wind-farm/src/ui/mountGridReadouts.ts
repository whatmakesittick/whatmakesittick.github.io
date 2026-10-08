import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import {
  ANNUAL_MWH_PER_TURBINE,
  CARBON_G_PER_KWH,
  PAYBACK_MONTHS,
  annualHomesPerTurbine,
  dayCapacityFactor,
  energyTodayMwh,
  homesNow,
} from '../model';
import { liveReading } from '../state';
import type { WindFarmStore } from '../state';
import {
  formatFarmMw,
  formatGramsPerKwh,
  formatHomes,
  formatMonths,
  formatMwh,
  formatPercent,
  formatVoltages,
} from './format';

export function mountGridReadouts(root: Document, store: WindFarmStore): Disposer {
  return mountLiveReadouts(root, store, {
    farmOutput: (state) => formatFarmMw(liveReading(state).farmKw),
    energyToday: (state) => formatMwh(energyTodayMwh(state.phase, state.siteWind, state.spacing)),
    homes: (state) => formatHomes(homesNow(liveReading(state).farmKw)),
    capacityFactor: (state) => formatPercent(dayCapacityFactor(state.siteWind, state.spacing)),
    voltages: () => formatVoltages(),
    annualEnergy: () => formatMwh(ANNUAL_MWH_PER_TURBINE),
    annualHomes: () => formatHomes(annualHomesPerTurbine()),
    carbon: () => formatGramsPerKwh(CARBON_G_PER_KWH),
    payback: () => formatMonths(PAYBACK_MONTHS),
  });
}
