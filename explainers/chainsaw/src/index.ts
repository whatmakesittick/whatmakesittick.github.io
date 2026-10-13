import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountChainsawScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createChainsawStore } from './state';
import type { ChainsawStoreState } from './state';
import { CHAINSAW_TIMELINE } from './timeline';
import {
  CHAINSAW_CHOICES,
  CHAINSAW_READOUTS,
  CHAPTER_ACTIONS,
  VIEW_TOGGLES,
  mountChainsawUi,
} from './ui';

export default defineExplainer<ChainsawStoreState>({
  timeline: CHAINSAW_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createChainsawStore(),
  dock: { choices: CHAINSAW_CHOICES, toggles: VIEW_TOGGLES },
  readouts: CHAINSAW_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountChainsawScene,
  mountUi: mountChainsawUi,
});
