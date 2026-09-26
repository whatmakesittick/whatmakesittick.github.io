import { formatFixed } from '@core/format';
import { t } from '@core/i18n';
import { requireElement, setText } from '@core/ui/dom';
import { configureRange, showRangeValue } from '@core/ui/range';
import { watchLocalized } from '@core/ui/subscribe';
import { COLLECTIVE_RANGE, collectivePitch, verticalTendency } from '../model';
import type { HelicopterStore } from '../state';
import { formatPitch, tendencyLabel } from './format';

const PERCENT = 100;

function formatLever(collective: number): string {
  return t('units.percent', { value: formatFixed(collective * PERCENT, 0) });
}

export function mountCollectiveControl(root: Document, store: HelicopterStore): void {
  const input = requireElement<HTMLInputElement>(root, '[data-control="collective"]');
  const lever = requireElement(root, '[data-readout="collective-lever"]');
  const pitch = requireElement(root, '[data-readout="collective-pitch"]');
  const result = requireElement(root, '[data-readout="collective-result"]');

  configureRange(input, COLLECTIVE_RANGE);
  input.addEventListener('input', () => store.getState().setCollective(Number(input.value)));

  watchLocalized(
    store,
    (state) => state.collective,
    (collective) => {
      const leverText = formatLever(collective);
      const tendency = verticalTendency(collective);
      showRangeValue(input, collective, leverText);
      setText(lever, leverText);
      setText(pitch, formatPitch(collectivePitch(collective)));
      setText(result, tendencyLabel(tendency));
      result.dataset.tendency = tendency;
    },
  );
}
