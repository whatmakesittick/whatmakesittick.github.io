import type { Disposer } from '@core/ui/disposers';
import { setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { PEAK_PRESSURE_MMHG } from '../model';
import type { HeartStore } from '../state';
import { formatMmHg, formatReceives, formatRole, formatSends, formatWall } from './format';
import { readoutElement } from './readoutElement';

export function mountChamberReadouts(root: Document, store: HeartStore): Disposer {
  const receives = readoutElement(root, 'chamber-receives');
  const sends = readoutElement(root, 'chamber-sends');
  const wall = readoutElement(root, 'chamber-wall');
  const pressure = readoutElement(root, 'chamber-pressure');
  const role = readoutElement(root, 'chamber-role');
  return watchLocalized(
    store,
    (state) => state.chamber,
    (chamber) => {
      setText(receives, formatReceives(chamber));
      setText(sends, formatSends(chamber));
      setText(wall, formatWall(chamber));
      setText(pressure, formatMmHg(PEAK_PRESSURE_MMHG[chamber]));
      setText(role, formatRole(chamber));
    },
  );
}
