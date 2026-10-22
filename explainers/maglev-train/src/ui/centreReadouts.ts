import { t } from '@core/i18n';
import { BEAM_M, BEAM_MASS_T, CURVE_RADII_M, GUIDE_GAP_MM, SWITCH_COUNT } from '../model';
import { whole } from './format';
import type { ChapterReadouts } from './readouts';

function formatGuideGap(): string {
  return t('chapters.centre.guideGapValue', { value: whole(GUIDE_GAP_MM) });
}

function formatCurves(): string {
  const [small, large] = CURVE_RADII_M;
  return t('chapters.centre.curvesValue', { small: whole(small), large: whole(large) });
}

export const CENTRE_READOUTS: ChapterReadouts = {
  guideGap: formatGuideGap,
  curves: formatCurves,
  beam: () => t('chapters.centre.beamValue', { metres: whole(BEAM_M), tonnes: whole(BEAM_MASS_T) }),
  switches: () => t('chapters.centre.switchesValue', { count: whole(SWITCH_COUNT) }),
};
