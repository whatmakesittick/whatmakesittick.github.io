import type { Readout } from '@core/explainer';
import type { ReadoutText } from '@core/ui/liveReadouts';
import { t } from '@core/i18n';
import { formatNumber } from '@core/format';
import {
  DROPLETS_PER_SECOND,
  WAVELENGTH_NM,
  dropletsPerSecondText,
  flashAt,
  lightLeftAt,
  opticsOf,
  smallestHalfPitchNm,
  wafersPerHour,
} from '../model';
import type { EuvStoreState } from '../state';
import { PHASE_TONES, THEME } from '../theme';
import { formatPercentOf, formatUnit } from './format';

export type ChapterReadouts = Readonly<Record<string, ReadoutText<EuvStoreState>>>;

function readout(id: string, value: ReadoutText<EuvStoreState>): Readout<EuvStoreState> {
  return { id, labelKey: `readouts.${id}`, numeric: true, value };
}

function placeOf({ phase, machine }: EuvStoreState) {
  return flashAt(phase, machine);
}

export function formatWafersPerHour({ machine }: EuvStoreState): string {
  const value = formatNumber(wafersPerHour(machine));
  return machine === 'exe5000'
    ? t('readouts.wph.about', { value })
    : formatUnit('perHour', wafersPerHour(machine));
}

export const EUV_READOUTS: readonly Readout<EuvStoreState>[] = [
  {
    id: 'where',
    labelKey: 'readouts.where',
    numeric: false,
    value: (state) => t(`readouts.place.${placeOf(state).place}`),
    tone: (state) => PHASE_TONES[placeOf(state).phase],
  },
  {
    ...readout('lightLeft', ({ phase }) => formatPercentOf(lightLeftAt(phase))),
    meter: { share: ({ phase }) => lightLeftAt(phase), fill: THEME.euv },
  },
  readout('wavelength', () => formatUnit('nm', WAVELENGTH_NM, 1)),
  readout('dropletRate', ({ machine }) => {
    const key = dropletsPerSecondText(machine) === 'exact' ? 'Exact' : 'OrMore';
    return t(`readouts.dropletRate${key}`, { value: formatNumber(DROPLETS_PER_SECOND) });
  }),
  readout('smallestLine', ({ machine }) =>
    formatUnit('nm', smallestHalfPitchNm(opticsOf(machine))),
  ),
  readout('wafersPerHour', formatWafersPerHour),
];
