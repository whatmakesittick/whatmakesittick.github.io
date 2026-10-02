import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { missionAt } from '../state';
import type { ReaperStore } from '../state';
import { formatSensorAim, formatSensorShows } from './format';

export function mountSensorReadouts(root: Document, store: ReaperStore): Disposer {
  return mountLiveReadouts(root, store, {
    'sensor-shows': (state) => formatSensorShows(state.sensorMode),
    'sensor-aim': (state) => formatSensorAim(missionAt(state).sensor),
  });
}
