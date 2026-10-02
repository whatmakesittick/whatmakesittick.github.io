import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { ReaperStore } from '../state';
import { mountAreaDistanceControl } from './mountAreaDistanceControl';
import { mountFlightReadouts } from './mountFlightReadouts';
import { mountLinkReadouts } from './mountLinkReadouts';
import { mountOverviewReadouts } from './mountOverviewReadouts';
import { mountSensorReadouts } from './mountSensorReadouts';
import { mountStrikeReadouts } from './mountStrikeReadouts';
import { mountTargetRangeControl } from './mountTargetRangeControl';

export { CHAPTER_ACTIONS } from './actions';
export { REAPER_CHOICES, VIEW_TOGGLES } from './dock';
export { REAPER_READOUTS } from './readouts';

export function mountReaperUi(root: Document, store: ReaperStore): Disposer {
  return disposeAll([
    mountOverviewReadouts(root, store),
    mountFlightReadouts(root, store),
    mountLinkReadouts(root, store),
    mountSensorReadouts(root, store),
    mountTargetRangeControl(root, store),
    mountStrikeReadouts(root, store),
    mountAreaDistanceControl(root, store),
  ]);
}
