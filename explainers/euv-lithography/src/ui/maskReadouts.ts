import { t } from '@core/i18n';
import { formatNumber } from '@core/format';
import { MASK_PATTERN_M, MASK_PLATE_M, maskTiltDeg, opticsOf, shrinkRatio } from '../model';
import { MASK_FACTS } from './copyFacts';
import { mmOf, whole } from './format';
import type { ChapterReadouts } from './readouts';

const PERCENT = 100;

export const MASK_READOUTS: ChapterReadouts = {
  plate: () => t('chapters.mask.plateValue', { mm: whole(mmOf(MASK_PLATE_M)) }),
  area: () =>
    t('chapters.mask.areaValue', {
      w: whole(mmOf(MASK_PATTERN_M.width)),
      h: whole(mmOf(MASK_PATTERN_M.height)),
    }),
  tilt: ({ machine }) => {
    const tilt = maskTiltDeg(opticsOf(machine));
    return t('chapters.mask.tiltValue', {
      deg: formatNumber(tilt),
      apart: formatNumber(tilt * MASK_FACTS.tiltPasses),
    });
  },
  pellicle: () =>
    t('chapters.mask.pellicleValue', {
      percent: whole(MASK_FACTS.pellicleOnePass * PERCENT),
      both: whole(MASK_FACTS.pellicleOnePass ** MASK_FACTS.tiltPasses * PERCENT),
    }),
  reduction: ({ machine }) =>
    t('chapters.mask.reductionValue', { n: whole(shrinkRatio(opticsOf(machine)).slit) }),
};
