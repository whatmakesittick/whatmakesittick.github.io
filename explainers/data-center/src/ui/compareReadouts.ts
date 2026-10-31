import { t } from '@core/i18n';
import type { CoolingId } from '../ids';
import { airflowFor } from '../model/cooling';
import { chargersFor, homesFor, overheadShare, rackPowerKw } from '../model/power';
import { formatPue, formatUnit, percentOf, whole } from './format';
import type { ChapterReadouts } from './readouts';

function fullRackKw(cooling: CoolingId): number {
  return rackPowerKw(cooling, 'full');
}

function formatHomes(cooling: CoolingId): string {
  const { us, eu } = homesFor(fullRackKw(cooling));
  return t('chapters.compare.homesValue', { us: whole(us), eu: whole(eu) });
}

export const COMPARE_READOUTS: ChapterReadouts = {
  cmpRack: ({ cooling }) => formatUnit('kw', fullRackKw(cooling)),
  airNeeded: ({ cooling }) => formatUnit('m3h', airflowFor(fullRackKw(cooling))),
  homes: ({ cooling }) => formatHomes(cooling),
  chargers: ({ cooling }) =>
    t('chapters.compare.chargersValue', { count: whole(chargersFor(fullRackKw(cooling))) }),
  cmpPue: ({ benchmark }) => formatPue(benchmark),
  overhead: ({ benchmark }) =>
    t('chapters.compare.overheadValue', { percent: percentOf(overheadShare(benchmark)) }),
};
