import { t } from '@core/i18n';
import { MACHINE_FACTS } from './copyFacts';
import { whole } from './format';
import type { ChapterReadouts } from './readouts';

export const MACHINE_READOUTS: ChapterReadouts = {
  weight: () => t('chapters.machine.weightValue', { tonnes: whole(MACHINE_FACTS.tonnes) }),
  shipping: () =>
    t('chapters.machine.shippingValue', {
      crates: whole(MACHINE_FACTS.crates),
      containers: whole(MACHINE_FACTS.containers),
      trucks: whole(MACHINE_FACTS.trucks),
    }),
  gap: () => t('chapters.machine.sizesValue'),
};
