import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountNavalDroneScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createNavalDroneStore } from './state';
import type { NavalDroneStoreState } from './state';
import { NAVAL_DRONE_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  NAVAL_DRONE_CHOICES,
  NAVAL_DRONE_READOUTS,
  VIEW_TOGGLES,
  mountNavalDroneUi,
} from './ui';

export default defineExplainer<NavalDroneStoreState>({
  id: 'naval-drone',
  timeline: NAVAL_DRONE_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createNavalDroneStore(),
  dock: { choices: NAVAL_DRONE_CHOICES, toggles: VIEW_TOGGLES },
  readouts: NAVAL_DRONE_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountNavalDroneScene,
  mountUi: mountNavalDroneUi,
});
