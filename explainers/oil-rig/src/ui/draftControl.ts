import { mountRangeWidget } from '@core/ui/rangeWidget';
import { airGapM, displacementT, keelWaveMotion } from '../model';
import { DRAFT_RANGE } from '../state';
import type { OilRigStore } from '../state';
import { formatMetresToTenths, formatPercent, formatTonnes } from './format';
import type { Disposer } from './disposers';

const DISPLACEMENT_ROUNDING_T = 100;

export function mountDraftControl(root: Document, store: OilRigStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'draft',
    range: DRAFT_RANGE,
    select: (state) => [state.draft] as const,
    value: ([draft]) => draft,
    format: ([draft]) => formatMetresToTenths(draft),
    set: (state, draft) => state.setDraft(draft),
    readouts: {
      'draft-displacement': ([draft]) =>
        formatTonnes(displacementT(draft), DISPLACEMENT_ROUNDING_T),
      'draft-air-gap': ([draft]) => formatMetresToTenths(airGapM(draft)),
      'draft-motion': ([draft]) => formatPercent(keelWaveMotion(draft)),
    },
  });
}
