import type { Readout } from '@core/explainer';
import { lineShare, timeGauge } from '../state';
import type { MriScannerStoreState } from '../state';
import { THEME } from '../theme';
import { formatLarmor, formatLines, formatTimeGauge } from './format';

export const MRI_SCANNER_READOUTS: readonly Readout<MriScannerStoreState>[] = [
  {
    id: 'larmor',
    labelKey: 'readouts.larmor',
    numeric: true,
    value: (state) => formatLarmor(state.field),
  },
  {
    id: 'time',
    labelKey: 'readouts.time',
    numeric: true,
    value: (state) => formatTimeGauge(timeGauge(state.phase, state.weighting)),
    meter: { share: (state) => timeGauge(state.phase, state.weighting).share, fill: THEME.rf },
  },
  {
    id: 'lines',
    labelKey: 'readouts.lines',
    numeric: true,
    value: (state) => formatLines(state.linesFilled),
    meter: { share: (state) => lineShare(state.linesFilled), fill: THEME.echo },
  },
];
