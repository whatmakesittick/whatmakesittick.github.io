import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountMechanicalWatchScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createWatchStore } from './state';
import type { WatchStoreState } from './state';
import { WATCH_TIMELINE } from './timeline';
import { CHAPTER_ACTIONS, VIEW_TOGGLES, WATCH_CHOICES, WATCH_READOUTS, mountWatchUi } from './ui';

export default defineExplainer<WatchStoreState>({
  id: 'mechanical-watch',
  timeline: WATCH_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createWatchStore(),
  dock: { choices: WATCH_CHOICES, toggles: VIEW_TOGGLES },
  readouts: WATCH_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountMechanicalWatchScene,
  mountUi: mountWatchUi,
});
