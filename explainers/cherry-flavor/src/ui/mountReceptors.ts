import { t } from '@core/i18n';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { RECEPTOR_TYPES } from '../model';
import { flavorReading } from '../state';
import type { FlavorStore } from '../state';
import { chapterOf } from './chapters';
import { formatCount } from './format';
import { sniffText } from './text';

export function formatFiring(count: number): string {
  return t('chapters.receptors.firingValue', {
    count: formatCount(count),
    total: formatCount(RECEPTOR_TYPES),
  });
}

export function mountReceptors(root: Document, store: FlavorStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'receptors'), store, {
    receptorsFiring: (state) => formatFiring(flavorReading(state).firing),
    receptorsSniffed: (state) => sniffText(state.sniff),
  });
}
