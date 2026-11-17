import { t } from '@core/i18n';
import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { ODORANT_IDS } from '../ids';
import type { OdorantId } from '../ids';
import { DROPS_RANGE, cherryMatch, closestSmell, totalDrops } from '../model';
import type { FlavorStore } from '../state';
import { chapterOf } from './chapters';
import { formatCount, formatPercent } from './format';

function mountDropSlider(chapter: HTMLElement, store: FlavorStore, id: OdorantId): Disposer {
  return mountRangeWidget(chapter, store, {
    control: id,
    range: DROPS_RANGE,
    select: (state) => [state.desk[id]] as const,
    value: ([drops]) => drops,
    format: ([drops]) => formatCount(drops),
    set: (state, drops) => state.setDrops(id, drops),
  });
}

export function mountDesk(root: Document, store: FlavorStore): Disposer {
  const chapter = chapterOf(root, 'desk');
  return disposeAll([
    ...ODORANT_IDS.map((id) => mountDropSlider(chapter, store, id)),
    mountLiveReadouts(chapter, store, {
      deskSmell: (state) => t(`smells.${closestSmell(state.desk)}`),
      deskMatch: (state) => formatPercent(cherryMatch(state.desk)),
      deskDrops: (state) => formatCount(totalDrops(state.desk)),
    }),
  ]);
}
