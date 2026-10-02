import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountFpvScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createFpvStore } from './state';
import type { FpvStoreState } from './state';
import { FPV_TIMELINE } from './timeline';
import { CHAPTER_ACTIONS, FPV_CHOICES, FPV_READOUTS, VIEW_TOGGLES, mountFpvUi } from './ui';

export default defineExplainer<FpvStoreState>({
  id: 'fpv-drone',
  timeline: FPV_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createFpvStore(),
  dock: { choices: FPV_CHOICES, toggles: VIEW_TOGGLES },
  readouts: FPV_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountFpvScene,
  mountUi: mountFpvUi,
});
