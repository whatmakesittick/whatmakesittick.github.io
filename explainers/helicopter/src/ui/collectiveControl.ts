import { formatFixed } from '@core/format';
import { t } from '@core/i18n';
import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { COLLECTIVE_RANGE, collectivePitch, verticalTendency } from '../model';
import type { HelicopterStore } from '../state';
import { formatPitch, tendencyLabel } from './format';

const PERCENT = 100;
const RESULT_READOUT = 'collective-result';

function formatLever(collective: number): string {
  return t('units.percent', { value: formatFixed(collective * PERCENT, 0) });
}

export function mountCollectiveControl(root: Document, store: HelicopterStore): void {
  mountRangeWidget(root, store, {
    control: 'collective',
    range: COLLECTIVE_RANGE,
    select: (state) => [state.collective] as const,
    value: ([collective]) => collective,
    format: ([collective]) => formatLever(collective),
    set: (state, collective) => state.setCollective(collective),
    readouts: {
      'collective-pitch': ([collective]) => formatPitch(collectivePitch(collective)),
      [RESULT_READOUT]: ([collective]) => tendencyLabel(verticalTendency(collective)),
    },
    after: ([collective], _state, widget) => {
      const result = requireElement(widget, `[data-readout="${RESULT_READOUT}"]`);
      result.dataset.tendency = verticalTendency(collective);
    },
  });
}
