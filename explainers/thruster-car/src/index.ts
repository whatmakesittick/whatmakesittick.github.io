import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountThrusterCarScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createThrusterCarStore } from './state';
import type { ThrusterCarStoreState } from './state';
import { THRUSTER_CAR_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  THRUSTER_CAR_CHOICES,
  THRUSTER_CAR_READOUTS,
  VIEW_TOGGLES,
  mountThrusterCarUi,
} from './ui';

export default defineExplainer<ThrusterCarStoreState>({
  timeline: THRUSTER_CAR_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createThrusterCarStore(),
  dock: { choices: THRUSTER_CAR_CHOICES, toggles: VIEW_TOGGLES },
  readouts: THRUSTER_CAR_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountThrusterCarScene,
  mountUi: mountThrusterCarUi,
});
