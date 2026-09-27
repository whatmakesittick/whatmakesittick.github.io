import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountEngineScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createEngineStore } from './state';
import type { EngineStoreState } from './state';
import { ENGINE_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  ENGINE_CHOICES,
  ENGINE_READOUTS,
  VIEW_TOGGLES,
  mountEngineUi,
} from './ui';

export default defineExplainer<EngineStoreState>({
  id: 'engine',
  timeline: ENGINE_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createEngineStore(),
  dock: { choices: ENGINE_CHOICES, toggles: VIEW_TOGGLES },
  readouts: ENGINE_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountEngineScene,
  mountUi: mountEngineUi,
});
