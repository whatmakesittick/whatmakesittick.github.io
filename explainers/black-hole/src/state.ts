import type { ExplainerStore, Playback, Preset, ViewFlags } from '@core/explainer';
import { createExplainerStore } from '@core/store';
import { BLACK_HOLE_TIMELINE, SPEED_RANGE } from './timeline';

export type PresetId = 'overview' | 'disc';
export type BlackHoleStore = ExplainerStore<Playback>;

export const DEFAULT_VIEW: ViewFlags = { disc: true };

export const PRESETS: Readonly<Record<PresetId, Preset>> = {
  overview: {},
  disc: { view: { disc: true } },
};

export function createBlackHoleStore(): BlackHoleStore {
  return createExplainerStore<object, Preset>({
    timeline: BLACK_HOLE_TIMELINE,
    presets: PRESETS,
    defaults: { preset: 'overview', speed: SPEED_RANGE.default, view: DEFAULT_VIEW },
    extend: () => ({}),
  });
}
