import { t } from '@core/i18n';
import type { CoolingId, LoadId } from '../ids';
import { BUSBAR_A, BUSBAR_V, COMPUTE_TRAYS, CPUS, GPUS, RACK_MASS_T, SWITCH_TRAYS } from '../model';
import { rackPowerKw } from '../model/power';
import { formatUnit, tenths, whole } from './format';
import type { ChapterReadouts } from './readouts';

const FAN_KEYS: Readonly<Record<CoolingId, Readonly<Record<LoadId, string>>>> = {
  liquid: { full: 'liquidFull', idle: 'liquidIdle' },
  air: { full: 'airFull', idle: 'airIdle' },
};

export const RACK_READOUTS: ChapterReadouts = {
  rackKw: ({ cooling, load }) => formatUnit('kw', rackPowerKw(cooling, load)),
  chips: () => t('chapters.rack.chipsValue', { gpus: whole(GPUS), cpus: whole(CPUS) }),
  trays: () =>
    t('chapters.rack.traysValue', { compute: whole(COMPUTE_TRAYS), switch: whole(SWITCH_TRAYS) }),
  busbar: () => t('chapters.rack.busbarValue', { amps: whole(BUSBAR_A), volts: whole(BUSBAR_V) }),
  weight: () => t('chapters.rack.weightValue', { tonnes: tenths(RACK_MASS_T) }),
  lost: () => t('chapters.rack.lostValue'),
  fans: ({ cooling, load }) => t(`chapters.rack.fansValue.${FAN_KEYS[cooling][load]}`),
};
