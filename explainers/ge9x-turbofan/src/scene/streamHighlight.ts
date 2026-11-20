import type { PartId, StreamId } from '../ids';
import { CHAPTER_CONTROL_DEFAULTS } from '../state';
import type { EngineStoreState, Preset } from '../state';

export const STREAM_HIGHLIGHT: Readonly<Record<StreamId, readonly PartId[]>> = {
  both: [],
  cold: ['fanBlades', 'spinner', 'fanCase', 'guideVanes', 'bypassDuct', 'coldNozzle', 'coldStream'],
  hot: [
    'booster',
    'compressor',
    'outerShaft',
    'innerShaft',
    'combustor',
    'hpTurbine',
    'lpTurbine',
    'hotNozzle',
    'hotStream',
  ],
};

export function highlightFor(
  preset: Preset,
  state: Pick<EngineStoreState, 'streams'>,
): readonly PartId[] {
  const chosenByPreset = preset.start.streams ?? CHAPTER_CONTROL_DEFAULTS.streams;
  return state.streams === chosenByPreset ? preset.highlight : STREAM_HIGHLIGHT[state.streams];
}
