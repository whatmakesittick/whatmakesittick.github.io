import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountEuvScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createEuvStore } from './state';
import type { EuvStoreState } from './state';
import { EUV_TIMELINE } from './timeline';
import { CHAPTER_ACTIONS, EUV_CHOICES, EUV_READOUTS, VIEW_TOGGLES, mountEuvUi } from './ui';

export default defineExplainer<EuvStoreState>({
  timeline: EUV_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createEuvStore(),
  dock: { choices: EUV_CHOICES, toggles: VIEW_TOGGLES },
  readouts: EUV_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountEuvScene,
  mountUi: mountEuvUi,
});
