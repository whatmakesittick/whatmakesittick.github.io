import './style.css';
import { defineExplainer } from '@core/explainer';
import type { Timeline } from '@core/explainer';
import { DEFAULT_PACE } from './model';
import { SCENE_OPTIONS, mountSwimScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createSwimStore } from './state';
import type { SwimStore, SwimStoreState } from './state';
import { createSwimTimeline } from './timeline';
import {
  CHAPTER_ACTIONS,
  PACE_CHOICES,
  SWIM_READOUTS,
  VIEW_TOGGLES,
  mountSwimGauge,
  mountSwimUi,
} from './ui';

interface BoundSwim {
  timeline: Timeline;
  createStore(): SwimStore;
}

function bindTimelineToStore(): BoundSwim {
  let getState: () => Pick<SwimStoreState, 'pace'> = () => ({ pace: DEFAULT_PACE });
  const timeline = createSwimTimeline(() => getState().pace);
  const createStore = () => {
    const store = createSwimStore({}, timeline);
    getState = store.getState;
    return store;
  };
  return { timeline, createStore };
}

const swim = bindTimelineToStore();

export default defineExplainer<SwimStoreState>({
  timeline: swim.timeline,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: swim.createStore,
  dock: { choices: PACE_CHOICES, toggles: VIEW_TOGGLES },
  readouts: SWIM_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountSwimScene,
  mountGauge: mountSwimGauge,
  mountUi: mountSwimUi,
});
