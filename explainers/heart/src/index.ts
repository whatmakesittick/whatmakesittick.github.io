import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountHeartScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createHeartStore } from './state';
import type { HeartStoreState } from './state';
import { HEART_TIMELINE } from './timeline';
import { CHAPTER_ACTIONS, HEART_CHOICES, HEART_READOUTS, VIEW_TOGGLES, mountHeartUi } from './ui';

export default defineExplainer<HeartStoreState>({
  id: 'heart',
  timeline: HEART_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createHeartStore(),
  dock: { choices: HEART_CHOICES, toggles: VIEW_TOGGLES },
  readouts: HEART_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountHeartScene,
  mountUi: mountHeartUi,
});
