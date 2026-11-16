import './style.css';
import { defineExplainer } from '@core/explainer';
import type { Timeline } from '@core/explainer';
import { SCENE_OPTIONS, mountIodineClockScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { CHAPTER_CONTROL_DEFAULTS, PRESETS, createClockStore } from './state';
import type { ClockStore, ClockStoreState, RecipeSource } from './state';
import { createClockTimeline } from './timeline';
import { CHAPTER_ACTIONS, CLOCK_CHOICES, CLOCK_READOUTS, VIEW_TOGGLES, mountClockUi } from './ui';

interface BoundClock {
  timeline: Timeline;
  createStore(): ClockStore;
}

function bindTimelineToStore(): BoundClock {
  let getState: () => RecipeSource = () => CHAPTER_CONTROL_DEFAULTS;
  const timeline = createClockTimeline(() => getState());
  const createStore = () => {
    const store = createClockStore();
    getState = store.getState;
    return store;
  };
  return { timeline, createStore };
}

const clock = bindTimelineToStore();

export default defineExplainer<ClockStoreState>({
  timeline: clock.timeline,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: clock.createStore,
  dock: { choices: CLOCK_CHOICES, toggles: VIEW_TOGGLES },
  readouts: CLOCK_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountIodineClockScene,
  mountUi: mountClockUi,
});
