import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountGliderScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createGliderStore } from './state';
import type { GliderStoreState } from './state';
import { GLIDER_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  GLIDER_CHOICES,
  GLIDER_READOUTS,
  VIEW_TOGGLES,
  mountGliderUi,
} from './ui';

export default defineExplainer<GliderStoreState>({
  id: 'glider',
  timeline: GLIDER_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createGliderStore(),
  dock: { choices: GLIDER_CHOICES, toggles: VIEW_TOGGLES },
  readouts: GLIDER_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountGliderScene,
  mountUi: mountGliderUi,
});
