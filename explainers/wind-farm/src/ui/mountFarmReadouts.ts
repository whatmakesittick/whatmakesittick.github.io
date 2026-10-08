import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { ACROSS_SPACING_D, TURBINE_COUNT, builtHectares, farmRatedMw, projectKm2 } from '../model';
import type { WindFarmStore } from '../state';
import {
  formatCount,
  formatHectares,
  formatRatedMw,
  formatSpacing,
  formatSquareKm,
} from './format';

export function mountFarmReadouts(root: Document, store: WindFarmStore): Disposer {
  return mountLiveReadouts(root, store, {
    turbineCount: () => formatCount(TURBINE_COUNT),
    farmRated: () => formatRatedMw(farmRatedMw()),
    rowSpacing: (state) => formatSpacing(state.spacing),
    acrossSpacing: () => formatSpacing(ACROSS_SPACING_D),
    builtLand: () => formatHectares(builtHectares()),
    projectArea: () => formatSquareKm(projectKm2()),
  });
}
