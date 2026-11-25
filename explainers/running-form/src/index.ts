import './style.css';
import { defineExplainer } from '@core/explainer';
import type { Timeline } from '@core/explainer';
import { DEFAULT_PACE, STEP_RATE_RANGE } from './model';
import { SCENE_OPTIONS, mountRunScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createRunStore } from './state';
import type { RunStore, RunStoreState } from './state';
import { createRunTimeline } from './timeline';
import {
  CHAPTER_ACTIONS,
  PACE_CHOICES,
  RUN_READOUTS,
  VIEW_TOGGLES,
  mountRunGauge,
  mountRunUi,
} from './ui';

interface BoundRun {
  timeline: Timeline;
  createStore(): RunStore;
}

function bindTimelineToStore(): BoundRun {
  let getState: () => Pick<RunStoreState, 'pace' | 'stepRate'> = () => ({
    pace: DEFAULT_PACE,
    stepRate: STEP_RATE_RANGE.default,
  });
  const timeline = createRunTimeline(
    () => getState().pace,
    () => getState().stepRate,
  );
  const createStore = () => {
    const store = createRunStore({}, timeline);
    getState = store.getState;
    return store;
  };
  return { timeline, createStore };
}

const run = bindTimelineToStore();

export default defineExplainer<RunStoreState>({
  timeline: run.timeline,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: run.createStore,
  dock: { choices: PACE_CHOICES, toggles: VIEW_TOGGLES },
  readouts: RUN_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountRunScene,
  mountGauge: mountRunGauge,
  mountUi: mountRunUi,
});
