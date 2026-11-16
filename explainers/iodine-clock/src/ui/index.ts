import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { ClockStore } from '../state';
import { mountInvisibleIodine } from './mountInvisibleIodine';
import { mountPour } from './mountPour';
import { mountSlowStep } from './mountSlowStep';
import { mountStarch } from './mountStarch';
import { mountTippingPoint } from './mountTippingPoint';
import { mountTuning } from './mountTuning';

export { CHAPTER_ACTIONS } from './actions';
export { CLOCK_CHOICES, VIEW_TOGGLES } from './dock';
export { CLOCK_READOUTS } from './readouts';

export function mountClockUi(root: Document, store: ClockStore): Disposer {
  return disposeAll([
    mountPour(root, store),
    mountSlowStep(root, store),
    mountInvisibleIodine(root, store),
    mountTippingPoint(root, store),
    mountStarch(root, store),
    mountTuning(root, store),
  ]);
}
