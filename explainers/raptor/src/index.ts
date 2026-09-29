import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountRaptorScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createRaptorStore } from './state';
import type { RaptorStoreState } from './state';
import { RAPTOR_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  RAPTOR_CHOICES,
  RAPTOR_READOUTS,
  VIEW_TOGGLES,
  mountRaptorUi,
} from './ui';

export default defineExplainer<RaptorStoreState>({
  id: 'raptor',
  timeline: RAPTOR_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createRaptorStore(),
  dock: { choices: RAPTOR_CHOICES, toggles: VIEW_TOGGLES },
  readouts: RAPTOR_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountRaptorScene,
  mountUi: mountRaptorUi,
});
