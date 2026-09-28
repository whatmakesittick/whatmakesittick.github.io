import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import {
  balanceAngle,
  beatProgress,
  escapeAdvanceInBeat,
  forkAngle,
  tickContactMs,
} from '../model';
import { amplitudeOf } from '../state';
import type { WatchState, WatchStore } from '../state';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { formatEscapeAdvance, formatMilliseconds, formatSignedDegrees, toTenths } from './format';

const TENTH_DIGITS = 1;

function forkAngleOf(state: WatchState): number {
  return toTenths(forkAngle(balanceAngle(state.phase, amplitudeOf(state))));
}

function escapeAdvanceOf(state: WatchState): number {
  return toTenths(escapeAdvanceInBeat(beatProgress(state.phase, amplitudeOf(state))));
}

function contactMsOf(state: WatchState): number {
  return toTenths(tickContactMs(state.phase, amplitudeOf(state)));
}

export function mountEscapementReadouts(root: Document, store: WatchStore): Disposer {
  const fork = requireElement(root, '[data-readout="escapement-fork"]');
  const wheel = requireElement(root, '[data-readout="escapement-wheel"]');
  const contact = requireElement(root, '[data-readout="escapement-contact"]');
  return disposeAll([
    watchLocalized(store, forkAngleOf, (degrees) =>
      setText(fork, formatSignedDegrees(degrees, TENTH_DIGITS)),
    ),
    watchLocalized(store, escapeAdvanceOf, (degrees) =>
      setText(wheel, formatEscapeAdvance(degrees)),
    ),
    watchLocalized(store, contactMsOf, (milliseconds) =>
      setText(contact, formatMilliseconds(milliseconds, TENTH_DIGITS)),
    ),
  ]);
}
