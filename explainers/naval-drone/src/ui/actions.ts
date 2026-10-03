import type { ChapterAction } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { FIT_IDS, HELM_IDS, LINK_MODES, MOMENT_IDS, SEA_STATE_IDS, SPEED_MARK_IDS } from '../ids';
import type { MomentId, PresetId } from '../ids';
import { MOMENTS, speedMarkAt } from '../model';
import { followedKnots } from '../state';
import type { NavalDroneStoreState } from '../state';

const NOTHING_CURRENT = '';
export const MOMENT_TOLERANCE_SECONDS = 0.3;

type ChapterChange<A extends unknown[]> = (state: NavalDroneStoreState, ...args: A) => void;

export function inChapter<A extends unknown[]>(
  preset: PresetId,
  change: ChapterChange<A>,
): ChapterChange<A> {
  return (state, ...args) => {
    if (state.preset !== preset) state.applyPreset(preset);
    change(state, ...args);
  };
}

function momentAt(state: NavalDroneStoreState): MomentId | undefined {
  return MOMENT_IDS.find(
    (moment) => Math.abs(MOMENTS[moment] - state.phase) <= MOMENT_TOLERANCE_SECONDS,
  );
}

export const CHAPTER_ACTIONS: Record<string, ChapterAction<NavalDroneStoreState>> = {
  moment: {
    run: inChapter('overview', (state, value: string) =>
      state.seekMoment(parseOption(value, MOMENT_IDS)),
    ),
    current: (state) => momentAt(state) ?? NOTHING_CURRENT,
  },
  speedMark: {
    run: inChapter('hull', (state, value: string) =>
      state.setSpeedMark(parseOption(value, SPEED_MARK_IDS)),
    ),
    current: (state) => speedMarkAt(followedKnots(state)) ?? NOTHING_CURRENT,
  },
  helm: {
    run: inChapter('jet', (state, value: string) => state.setHelm(parseOption(value, HELM_IDS))),
    current: (state) => state.helm,
  },
  linkMode: {
    run: inChapter('link', (state, value: string) =>
      state.setLinkMode(parseOption(value, LINK_MODES)),
    ),
    current: (state) => state.linkMode,
  },
  seaState: {
    run: inChapter('horizon', (state, value: string) =>
      state.setSeaState(parseOption(value, SEA_STATE_IDS)),
    ),
    current: (state) => state.seaState,
  },
  fit: {
    run: inChapter('fleet', (state, value: string) => state.setFit(parseOption(value, FIT_IDS))),
    current: (state) => state.fit,
  },
};
