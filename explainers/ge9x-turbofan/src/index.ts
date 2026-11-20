import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountEngineScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createEngineStore } from './state';
import type { EngineStoreState } from './state';
import { AIR_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  ENGINE_CHOICES,
  ENGINE_READOUTS,
  ENGINE_SHORTCUTS,
  VIEW_TOGGLES,
  mountEngineUi,
  mountThrustLever,
} from './ui';

export default defineExplainer<EngineStoreState>({
  timeline: AIR_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createEngineStore(),
  dock: { choices: ENGINE_CHOICES, toggles: VIEW_TOGGLES },
  readouts: ENGINE_READOUTS,
  actions: CHAPTER_ACTIONS,
  shortcuts: ENGINE_SHORTCUTS,
  scene: SCENE_OPTIONS,
  mountScene: mountEngineScene,
  mountGauge: mountThrustLever,
  mountUi: mountEngineUi,
});
