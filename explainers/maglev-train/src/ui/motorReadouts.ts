import { t } from '@core/i18n';
import type { WaveReading } from '../ids';
import { CONVERTER_MAX_HZ, POLE_PITCH_M, SECTION_COUNT, fieldWavelength } from '../model';
import type { LiveReader } from '../state';
import { WHOLE, formatMm, formatRange, formatUnit, toMillimetres, whole } from './format';
import type { ChapterReadouts } from './readouts';

const CONVERTER_MIN_HZ = 0;

function formatSection({ on, sectionIndex }: WaveReading): string {
  if (!on) return t('chapters.motor.sectionOff');
  return t('chapters.motor.sectionValue', {
    index: whole(sectionIndex + 1),
    count: whole(SECTION_COUNT),
  });
}

export function motorReadouts(read: LiveReader): ChapterReadouts {
  return {
    frequency: (state) => formatUnit('hz', read(state).wave.hz),
    pitch: () => formatMm(toMillimetres(POLE_PITCH_M), WHOLE),
    wavelength: () => formatMm(toMillimetres(fieldWavelength()), WHOLE),
    converter: () => formatRange('hzRange', CONVERTER_MIN_HZ, CONVERTER_MAX_HZ),
    section: (state) => formatSection(read(state).wave),
  };
}
