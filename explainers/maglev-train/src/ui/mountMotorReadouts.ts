import { t } from '@core/i18n';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { WaveReading } from '../ids';
import { CONVERTER_MAX_HZ, POLE_PITCH_M, SECTION_COUNT, fieldWavelength } from '../model';
import { createLiveReader } from '../state';
import type { MaglevTrainStore } from '../state';
import { WHOLE, formatHz, formatHzRange, formatMm, toMillimetres, whole } from './format';

const CONVERTER_MIN_HZ = 0;

function formatSection({ on, sectionIndex }: WaveReading): string {
  if (!on) return t('chapters.motor.sectionOff');
  return t('chapters.motor.sectionValue', {
    index: whole(sectionIndex + 1),
    count: whole(SECTION_COUNT),
  });
}

export function mountMotorReadouts(root: Document, store: MaglevTrainStore): Disposer {
  const read = createLiveReader();
  return mountLiveReadouts(root, store, {
    frequency: (state) => formatHz(read(state).wave.hz),
    pitch: () => formatMm(toMillimetres(POLE_PITCH_M), WHOLE),
    wavelength: () => formatMm(toMillimetres(fieldWavelength()), WHOLE),
    converter: () => formatHzRange(CONVERTER_MIN_HZ, CONVERTER_MAX_HZ),
    section: (state) => formatSection(read(state).wave),
  });
}
