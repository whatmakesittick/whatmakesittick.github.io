import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import type { SeaStateId } from '../ids';
import { RADAR_HEIGHT_M, minutesAtTopSpeed, radarLineOfSightKm } from '../model';
import type { NavalDroneStore } from '../state';
import {
  formatCameraHorizon,
  formatDetection,
  formatHidden,
  formatKm,
  formatMetres,
  formatMinutes,
  formatWaves,
} from './format';
import { HorizonView } from './horizonView';

type SelectedRadar = readonly [radarHeight: number, seaState: SeaStateId];

export function mountHorizonControl(root: Document, store: NavalDroneStore): Disposer {
  const view = new HorizonView(requireElement<HTMLCanvasElement>(root, '[data-view="horizon"]'));
  const unmount = disposeAll([
    mountRangeWidget(root, store, {
      control: 'radar-height',
      range: RADAR_HEIGHT_M,
      select: (state): SelectedRadar => [state.radarHeight, state.seaState],
      value: ([radarHeight]) => radarHeight,
      format: ([radarHeight]) => formatMetres(radarHeight),
      set: (state, radarHeight) => state.setRadarHeight(radarHeight),
      readouts: {
        'horizon-radar': ([radarHeight]) => formatKm(radarLineOfSightKm(radarHeight)),
        'horizon-minutes': ([radarHeight]) =>
          formatMinutes(minutesAtTopSpeed(radarLineOfSightKm(radarHeight))),
      },
      after: ([radarHeight, seaState]) => view.draw({ radarHeight, seaState }),
    }),
    mountLiveReadouts(root, store, {
      'horizon-camera': () => formatCameraHorizon(),
      'horizon-detect': (state) => formatDetection(state.seaState),
      'horizon-waves': (state) => formatWaves(state.seaState),
      'horizon-hidden': (state) => formatHidden(state.seaState),
    }),
  ]);
  return () => {
    unmount();
    view.dispose();
  };
}
