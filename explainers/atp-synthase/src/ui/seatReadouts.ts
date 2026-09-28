import type { Disposer } from '@core/ui/disposers';
import { requireElement, setText } from '@core/ui/dom';
import { watchShallowLocalized } from '@core/ui/subscribe';
import { BETA_INDICES } from '../ids';
import type { BetaIndex, SiteState } from '../ids';
import { siteState } from '../model';
import type { AtpSynthaseState, AtpSynthaseStore } from '../state';
import { describeSite } from './format';

interface SeatRow {
  readonly row: HTMLElement;
  readonly doing: HTMLElement;
}

function seatRow(root: Document, beta: BetaIndex): SeatRow {
  return {
    row: requireElement(root, `.seat-readouts [data-seat="${beta}"]`),
    doing: requireElement(root, `[data-readout="seat-${beta}"]`),
  };
}

function seatStates(state: AtpSynthaseState): readonly SiteState[] {
  return BETA_INDICES.map((beta) => siteState(beta, state.phase));
}

function showSeat({ row, doing }: SeatRow, state: SiteState): void {
  row.dataset.state = state;
  setText(doing, describeSite(state));
}

export function mountSeatReadouts(root: Document, store: AtpSynthaseStore): Disposer {
  const rows = BETA_INDICES.map((beta) => seatRow(root, beta));
  return watchShallowLocalized(store, seatStates, (states) =>
    states.forEach((state, index) => showSeat(rows[index], state)),
  );
}
