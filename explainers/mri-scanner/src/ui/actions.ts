import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import {
  AXIS_CHOICE_IDS,
  FIELD_IDS,
  FOLLOW_SEQUENCE,
  LINE_CHOICE_IDS,
  MOMENT_IDS,
  TISSUE_IDS,
  WEIGHTING_IDS,
} from '../ids';
import type { GradientAxisId, PresetId } from '../ids';
import type { MriScannerStoreState } from '../state';
import { momentAt } from '../timeline';

const NOTHING_CURRENT = '';

type ChapterChange<A extends unknown[]> = (state: MriScannerStoreState, ...args: A) => void;

export function inChapter<A extends unknown[]>(
  preset: PresetId,
  change: ChapterChange<A>,
): ChapterChange<A> {
  return (state, ...args) => {
    if (state.preset !== preset) state.applyPreset(preset);
    change(state, ...args);
  };
}

function axisOf(value: string): GradientAxisId | null {
  const choice = parseOption(value, AXIS_CHOICE_IDS);
  return choice === FOLLOW_SEQUENCE ? null : choice;
}

function pausedMoment(state: MriScannerStoreState): string {
  if (state.playing) return NOTHING_CURRENT;
  return momentAt(state.phase) ?? NOTHING_CURRENT;
}

function lineChoiceOf(lines: number): string {
  return LINE_CHOICE_IDS.find((choice) => Number(choice) === lines) ?? NOTHING_CURRENT;
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<MriScannerStoreState>> = {
  field: {
    run: (state, value) => state.setField(parseOption(value, FIELD_IDS)),
    current: (state) => state.field,
  },
  weighting: {
    run: inChapter('picture', (state, value: string) =>
      state.setWeighting(parseOption(value, WEIGHTING_IDS)),
    ),
    current: (state) => state.weighting,
  },
  tissue: {
    run: inChapter('resonance', (state, value: string) =>
      state.setTissue(parseOption(value, TISSUE_IDS)),
    ),
    current: (state) => state.tissue,
  },
  gradientAxis: {
    run: inChapter('gradients', (state, value: string) => state.setGradientAxis(axisOf(value))),
    current: (state) => state.gradientAxis ?? FOLLOW_SEQUENCE,
  },
  moment: {
    run: inChapter('resonance', (state, value: string) =>
      state.seekMoment(parseOption(value, MOMENT_IDS)),
    ),
    current: pausedMoment,
  },
  lines: {
    run: inChapter('picture', (state, value: string) =>
      state.setLinesFilled(Number(parseOption(value, LINE_CHOICE_IDS))),
    ),
    current: (state) => lineChoiceOf(state.linesFilled),
  },
};
